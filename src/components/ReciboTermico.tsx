import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '../lib/supabase';

// Função para buscar o nome do usuário pelo email
const buscarNomeUsuario = async (email: string): Promise<string> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('nome')
      .eq('email', email)
      .single();
    
    if (error || !data || !data.nome) {
      // Se houver erro ou não encontrar o nome, retorna a parte antes do @
      return email.split('@')[0];
    }
    
    return data.nome;
  } catch (error) {
    console.error('Erro ao buscar nome do usuário:', error);
    // Em caso de erro, retorna a parte antes do @
    return email.split('@')[0];
  }
};

// Aceita tanto o tipo Lancamento do módulo financeiro quanto do módulo caixa
export const gerarReciboTermico = async (lancamento: any) => {
  console.log('Iniciando geração do recibo para:', JSON.stringify(lancamento, null, 2));
  
  // Verificar se o lançamento tem as propriedades necessárias
  console.log('Verificando propriedades do lançamento:');
  console.log('- titulo_id:', lancamento.titulo_id);
  console.log('- nossonumero:', lancamento.nossonumero);
  console.log('- vencimento:', lancamento.vencimento);
  console.log('- titulobancario:', lancamento.titulobancario);
  
  try {
    // Se o lançamento tem titulobancario, usar como nossonumero
    if (lancamento.titulobancario) {
      console.log('Usando titulobancario como nossonumero:', lancamento.titulobancario);
      lancamento.nossonumero = lancamento.titulobancario;
    }
    
    // Se o lançamento tem um título associado mas não tem as informações de nossonumero e vencimento,
    // buscar essas informações do título
    if (lancamento.titulo_id && (!lancamento.nossonumero || !lancamento.vencimento)) {
      console.log('Buscando informações do título associado:', lancamento.titulo_id);
      try {
        const { data: titulo, error } = await supabase
          .from('titulos')
          .select('*')
          .eq('id', lancamento.titulo_id)
          .single();
        
        if (error) {
          console.error('Erro ao buscar título:', error);
        } else if (titulo) {
          console.log('Título encontrado:', JSON.stringify(titulo, null, 2));
          // Adicionar as informações do título ao lançamento
          lancamento.nossonumero = titulo.nossonumero;
          lancamento.vencimento = titulo.vencimento;
          console.log('Lançamento atualizado com dados do título:', JSON.stringify({
            nossonumero: lancamento.nossonumero,
            vencimento: lancamento.vencimento
          }, null, 2));
        } else {
          console.log('Nenhum título encontrado com o ID:', lancamento.titulo_id);
        }
      } catch (error) {
        console.error('Erro ao buscar título:', error);
      }
    }
    
    // Se ainda não tem nossonumero, mas tem titulobancario, tentar buscar pelo titulobancario
    if (!lancamento.nossonumero && lancamento.titulobancario) {
      console.log('Buscando título pelo nossonumero:', lancamento.titulobancario);
      try {
        const { data: titulo, error } = await supabase
          .from('titulos')
          .select('*')
          .eq('nossonumero', lancamento.titulobancario)
          .single();
        
        if (error) {
          console.error('Erro ao buscar título pelo nossonumero:', error);
        } else if (titulo) {
          console.log('Título encontrado pelo nossonumero:', JSON.stringify(titulo, null, 2));
          // Adicionar as informações do título ao lançamento
          lancamento.nossonumero = titulo.nossonumero;
          lancamento.vencimento = titulo.vencimento;
        }
      } catch (error) {
        console.error('Erro ao buscar título pelo nossonumero:', error);
      }
    }

    // Criar novo documento PDF
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 150] // Largura típica de papel térmico: 80mm
    });

    // Configurar fonte e tamanho
    doc.setFontSize(8);

    // Posição inicial
    let y = 10;
    const margin = 5;
    const width = 70; // Largura útil do papel

    // Função para adicionar texto centralizado
    const addCenteredText = (text: string) => {
      const textWidth = doc.getTextWidth(text);
      const x = (width - textWidth) / 2 + margin;
      doc.text(text, x, y);
      y += 4;
    };

    // Função para adicionar texto com quebra de linha
    const addWrappedText = (text: string) => {
      const words = text.split(' ');
      let line = '';
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const testWidth = doc.getTextWidth(testLine);
        
        if (testWidth > width) {
          doc.text(line, margin, y);
          line = word + ' ';
          y += 4;
        } else {
          line = testLine;
        }
      }
      
      if (line.trim()) {
        doc.text(line.trim(), margin, y);
        y += 4;
      }
    };

    // Função para adicionar linha
    const addLine = () => {
      doc.setLineWidth(0.1);
      doc.line(margin, y, width + margin, y);
      y += 4;
    };

    // Formatar valor monetário
    const formatMoney = (value: number | null | undefined) => {
      if (value === null || value === undefined) return 'R$ 0,00';
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    };

    // Cabeçalho
    doc.setFontSize(10);
    addCenteredText('CONECTE TELECOM');
    doc.setFontSize(8);
    addCenteredText('CNPJ: 41.143.126/0001-00');
    addCenteredText('Arroio do Sal - RS');
    addLine();

    // Detalhes do lançamento
    addCenteredText('RECIBO');
    y += 2;
    
    // Data e hora
    const dataFormatada = format(
      new Date(lancamento.data_cad_lancamento || lancamento.data_pagamento), 
      "dd/MM/yyyy 'às' HH:mm", 
      { locale: ptBR }
    );
    doc.text(`Data: ${dataFormatada}`, margin, y);
    y += 4;

    // Tipo de operação
    doc.text(`Tipo: ${lancamento.tipopag}`, margin, y);
    y += 4;

    // Cliente
    if (lancamento.cliente?.nome) {
      doc.text(`Cliente: ${lancamento.cliente.nome}`, margin, y);
      y += 4;
    }

    // Nosso Número (se existir)
    if (lancamento.nossonumero) {
      console.log('Adicionando Nosso Número ao recibo:', lancamento.nossonumero);
      doc.text(`Nosso Número: ${lancamento.nossonumero}`, margin, y);
      y += 4;
    } else {
      console.log('Nosso Número não disponível no lançamento:', JSON.stringify(lancamento, null, 2));
    }

    // Data de Vencimento (se existir)
    if (lancamento.vencimento) {
      console.log('Adicionando Vencimento ao recibo:', lancamento.vencimento);
      const vencimentoFormatado = format(
        new Date(lancamento.vencimento), 
        "dd/MM/yyyy", 
        { locale: ptBR }
      );
      doc.text(`Vencimento: ${vencimentoFormatado}`, margin, y);
      y += 4;
    } else {
      console.log('Vencimento não disponível no lançamento:', JSON.stringify(lancamento, null, 2));
    }

    // Descrição
    doc.text('Descrição:', margin, y);
    y += 4;
    addWrappedText(lancamento.descricao);

    // Forma de pagamento
    if (lancamento.forma_pagamento) {
      doc.text(`Forma de Pagamento: ${lancamento.forma_pagamento}`, margin, y);
      y += 4;
    } else if (lancamento.tipopag === 'RECEITA') {
      // Se for do tipo financeiro, mostrar detalhes de pagamento
      const formasPagamento = [];
      if (lancamento.entrada_pixsicredi > 0) formasPagamento.push(`PIX: ${formatMoney(lancamento.entrada_pixsicredi)}`);
      if (lancamento.entrada_cartaocredito > 0) formasPagamento.push(`Crédito: ${formatMoney(lancamento.entrada_cartaocredito)}`);
      if (lancamento.entrada_cartaodebito > 0) formasPagamento.push(`Débito: ${formatMoney(lancamento.entrada_cartaodebito)}`);
      if (lancamento.entrada_dinheiro > 0) formasPagamento.push(`Dinheiro: ${formatMoney(lancamento.entrada_dinheiro)}`);
      
      if (formasPagamento.length > 0) {
        doc.text('Formas de Pagamento:', margin, y);
        y += 4;
        formasPagamento.forEach(forma => {
          doc.text(forma, margin, y);
          y += 4;
        });
      }
    }

    addLine();

    // Valor
    doc.setFontSize(10);
    const valor = formatMoney(lancamento.valor || lancamento.total);
    
    addCenteredText(`Valor Total: ${valor}`);
    doc.setFontSize(8);
    y += 2;

    // Detalhes adicionais para receitas
    if (lancamento.tipopag === 'RECEITA') {
      if (lancamento.desconto > 0) {
        doc.text(`Desconto: ${formatMoney(lancamento.desconto)}`, margin, y);
        y += 4;
      }
      if (lancamento.juros > 0) {
        doc.text(`Juros: ${formatMoney(lancamento.juros)}`, margin, y);
        y += 4;
      }
      if (lancamento.multa > 0) {
        doc.text(`Multa: ${formatMoney(lancamento.multa)}`, margin, y);
        y += 4;
      }
      if (lancamento.troco > 0) {
        doc.text(`Troco: ${formatMoney(lancamento.troco)}`, margin, y);
        y += 4;
      }
    }

    addLine();

    // Operador
    if (lancamento.quemrecebeu) {
      // Buscar o nome real do operador na tabela users
      const nomeOperador = await buscarNomeUsuario(lancamento.quemrecebeu);
      doc.text(`Operador: ${nomeOperador}`, margin, y);
      y += 6;
    }

    addLine();

    // Rodapé
    y += 6;
    doc.setFontSize(6);
    addCenteredText('CONECTE TELECOM');
    addCenteredText('Obrigado pela preferência!');

    // Abrir o PDF em uma nova janela
    const pdfOutput = doc.output('bloburl');
    console.log('PDF gerado com sucesso, abrindo URL:', pdfOutput);
    window.open(pdfOutput, '_blank');
    return true;
  } catch (error) {
    console.error('Erro durante a geração do PDF:', error);
    throw error;
  }
};
