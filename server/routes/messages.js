const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Inicializar cliente Supabase com valores padrão caso as variáveis de ambiente não estejam definidas
const supabaseUrl = process.env.SUPABASE_URL || 'https://dieycvogftvfoncigvtl.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRpZXljdm9nZnR2Zm9uY2lndnRsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0ODU4NzUsImV4cCI6MjA1NjA2MTg3NX0.5StyYMsrRVhSkcHjR-V7vSgcqU5q0lYbyc9Q7kLvZIQ';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Rota para obter mensagens pendentes para envio
 * Esta rota será chamada pelo N8N para buscar as mensagens que precisam ser enviadas
 */
router.get('/pending', async (req, res) => {
  try {
    // Buscar todos os tipos de mensagem
    const { data: tiposMensagem, error: tiposError } = await supabase
      .from('tipos_mensagem')
      .select('*');

    if (tiposError) {
      console.error('Erro ao buscar tipos de mensagem:', tiposError);
      return res.status(500).json({ error: 'Erro ao buscar tipos de mensagem' });
    }

    if (!tiposMensagem || tiposMensagem.length === 0) {
      return res.json({ mensagens: [] });
    }

    // Obter a data atual
    const hoje = new Date();
    const dataHoje = hoje.toISOString().split('T')[0]; // Formato YYYY-MM-DD

    // Array para armazenar todas as mensagens pendentes
    const mensagensPendentes = [];

    // Para cada tipo de mensagem, buscar os contratos que precisam receber a mensagem
    for (const tipo of tiposMensagem) {
      // Determinar a data alvo com base no número de dias
      const diasDiferenca = tipo.dias;
      const dataAlvo = new Date(hoje);
      dataAlvo.setDate(hoje.getDate() + diasDiferenca);
      const dataAlvoStr = dataAlvo.toISOString().split('T')[0]; // Formato YYYY-MM-DD

      // Consulta para encontrar contratos
      let query = supabase
        .from('contratos')
        .select(`
          id, 
          pppoe, 
          valor_mensalidade,
          dia_vencimento,
          clientes(id, nome, telefone)
        `)
        .eq('status', 'Ativo');

      // Filtrar com base no tipo de mensagem
      if (diasDiferenca > 0) {
        // Lembrete antes do vencimento
        // Encontrar contratos cujo dia de vencimento é igual à data alvo
        const diaVencimentoAlvo = dataAlvo.getDate();
        query = query.eq('dia_vencimento', diaVencimentoAlvo);
      } else {
        // Aviso após vencimento
        // Encontrar contratos cujo dia de vencimento + dias de atraso é igual à data de hoje
        const diaVencimentoAlvo = new Date(hoje);
        diaVencimentoAlvo.setDate(diaVencimentoAlvo.getDate() + diasDiferenca); // Subtrair dias de atraso
        const diaDoMes = diaVencimentoAlvo.getDate();
        query = query.eq('dia_vencimento', diaDoMes);
      }

      const { data: contratos, error: contratosError } = await query;

      if (contratosError) {
        console.error(`Erro ao buscar contratos para o tipo ${tipo.nome}:`, contratosError);
        continue;
      }

      if (!contratos || contratos.length === 0) {
        continue;
      }

      // Para cada contrato, verificar se já foi enviada uma mensagem do mesmo tipo recentemente
      for (const contrato of contratos) {
        if (!contrato.clientes || !contrato.clientes.telefone) {
          console.log(`Contrato ${contrato.id} não tem cliente ou telefone válido`);
          continue;
        }

        // Verificar se já foi enviada uma mensagem do mesmo tipo nos últimos 30 dias
        const trintaDiasAtras = new Date(hoje);
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        const trintaDiasAtrasStr = trintaDiasAtras.toISOString();

        const { data: mensagensRecentes, error: mensagensError } = await supabase
          .from('mensagens_enviadas')
          .select('*')
          .eq('id_contrato', contrato.id)
          .eq('id_tipo_mensagem', tipo.id)
          .gte('data_envio', trintaDiasAtrasStr);

        if (mensagensError) {
          console.error(`Erro ao verificar mensagens recentes para o contrato ${contrato.id}:`, mensagensError);
          continue;
        }

        if (mensagensRecentes && mensagensRecentes.length > 0) {
          console.log(`Já foi enviada uma mensagem do tipo ${tipo.nome} para o contrato ${contrato.id} nos últimos 30 dias`);
          continue;
        }

        // Preparar a mensagem para envio
        const cliente = contrato.clientes;
        const telefone = cliente.telefone.replace(/\D/g, ''); // Remover caracteres não numéricos
        
        // Pular se o telefone não for válido
        if (telefone.length < 10) {
          console.log(`Telefone inválido para o cliente ${cliente.nome}: ${telefone}`);
          continue;
        }

        // Calcular o dia de vencimento no mês atual
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();
        const dataVencimento = new Date(anoAtual, mesAtual, contrato.dia_vencimento);
        
        // Se o dia de vencimento já passou neste mês, considerar o próximo mês
        if (dataVencimento < hoje && diasDiferenca > 0) {
          dataVencimento.setMonth(dataVencimento.getMonth() + 1);
        }

        // Calcular dias até o vencimento ou dias de atraso
        const diffTime = Math.abs(dataVencimento - hoje);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        let diasVencimento = 0;
        let diasAtraso = 0;
        
        if (dataVencimento > hoje) {
          diasVencimento = diffDays;
        } else {
          diasAtraso = diffDays;
        }

        // Preparar a mensagem com os placeholders substituídos
        let mensagemTexto = tipo.mensagem_template
          .replace(/{cliente}/g, cliente.nome)
          .replace(/{valor}/g, contrato.valor_mensalidade.toFixed(2))
          .replace(/{dias_vencimento}/g, diasVencimento.toString())
          .replace(/{dias_atraso}/g, diasAtraso.toString());

        // Adicionar à lista de mensagens pendentes
        mensagensPendentes.push({
          id_contrato: contrato.id,
          id_tipo_mensagem: tipo.id,
          telefone: telefone,
          nome_cliente: cliente.nome,
          mensagem_enviada: mensagemTexto
        });
      }
    }

    res.json({ mensagens: mensagensPendentes });
  } catch (error) {
    console.error('Erro ao processar mensagens pendentes:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

/**
 * Rota para registrar uma mensagem como enviada
 */
router.post('/registrar-envio', async (req, res) => {
  try {
    const { mensagens } = req.body;
    
    if (!mensagens || !Array.isArray(mensagens) || mensagens.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem fornecida para registro' });
    }

    const registros = [];
    
    for (const mensagem of mensagens) {
      const { data, error } = await supabase
        .from('mensagens_enviadas')
        .insert({
          id_contrato: mensagem.id_contrato,
          id_tipo_mensagem: mensagem.id_tipo_mensagem,
          telefone: mensagem.telefone,
          nome_cliente: mensagem.nome_cliente,
          mensagem_enviada: mensagem.mensagem_enviada,
          data_envio: new Date().toISOString()
        })
        .select();

      if (error) {
        console.error('Erro ao registrar mensagem enviada:', error);
        continue;
      }

      if (data && data.length > 0) {
        registros.push(data[0]);
      }
    }

    res.json({ 
      success: true, 
      mensagens_registradas: registros.length,
      registros 
    });
  } catch (error) {
    console.error('Erro ao registrar mensagens enviadas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;
