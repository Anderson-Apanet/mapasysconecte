import React, { useState, MouseEvent } from 'react';
import { Dialog } from '@headlessui/react';
import { DocumentTextIcon, PrinterIcon } from '@heroicons/react/24/outline';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import html2pdf from 'html2pdf.js';

interface DocumentEditorProps {
  isOpen: boolean;
  onClose: () => void;
  documentType: 'adesao' | 'permanencia';
  contractData: {
    clientName: string;
    cpf: string;
    rg: string;
    address: string;
    city: string;
    state: string;
    cep: string;
    email: string;
    phone: string;
    planName: string;
    planValue: number;
    downloadSpeed: number;
    uploadSpeed: number;
    installationDate: string;
  };
}

const DocumentEditor: React.FC<DocumentEditorProps> = ({
  isOpen,
  onClose,
  documentType,
  contractData
}) => {
  const [content, setContent] = useState(() => {
    if (documentType === 'adesao') {
      return generateAdesaoTemplate(contractData);
    } else {
      return generatePermanenciaTemplate(contractData);
    }
  });

  const handlePrint = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const element = document.getElementById('document-content');
    if (!element) return;

    const opt = {
      margin: 1,
      filename: `contrato_${documentType}_${contractData.clientName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };

    try {
      await html2pdf().set(opt).from(element).save();
      console.log('PDF gerado com sucesso');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
    }
  };

  const handleDialogClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleEditorClick = (e: MouseEvent) => {
    e.stopPropagation();
  };

  const handleCloseClick = (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="relative z-[2001]" aria-modal="true" role="dialog">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div 
          className="relative w-full max-w-4xl bg-white rounded-lg shadow-xl"
          onClick={handleDialogClick}
          style={{ zIndex: 2001 }}
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">
                {documentType === 'adesao' ? 'Contrato de Adesão' : 'Contrato de Permanência'}
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handlePrint}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PrinterIcon className="h-5 w-5 mr-2" />
                  Gerar PDF
                </button>
                <button
                  onClick={handleCloseClick}
                  className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  Fechar
                </button>
              </div>
            </div>
            
            <div className="bg-white rounded-lg" onClick={handleEditorClick}>
              <div id="document-content" className="p-6">
                <ReactQuill
                  value={content}
                  onChange={setContent}
                  modules={{
                    toolbar: [
                      [{ header: [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline'],
                      [{ list: 'ordered' }, { list: 'bullet' }],
                      ['clean']
                    ]
                  }}
                  className="h-[600px] mb-12 editor-container"
                  preserveWhitespace={true}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const generateAdesaoTemplate = (data: DocumentEditorProps['contractData']) => {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  
  return `
    <h1 style="text-align: center; margin-bottom: 20px;">TERMO DE ADESÃO AO CONTRATO DE PRESTAÇÃO DE SERVIÇOS</h1>

    <h2>DADOS DA PRESTADORA</h2>
    <p>
    Nome Empresarial: CONECTE TELECOM LTDA<br>
    CNPJ: 41.143.126/0001-00<br>
    Inscrição Estadual: 250/0020066<br>
    Endereço: Rua Paulista, nº 183, Sala 03<br>
    Bairro: Centro<br>
    Cidade: Arroio do Sal<br>
    Estado: Rio Grande do Sul<br>
    CEP: 95585-000<br>
    Telefone: (51) 99759-7259<br>
    E-mail: conecte@seconecte.net
    </p>

    <h2>DADOS DO ASSINANTE</h2>
    <p>
    Nome: ${data.clientName}<br>
    CPF/CNPJ: ${data.cpf}<br>
    RG: ${data.rg}<br>
    Endereço: ${data.address}<br>
    Cidade: ${data.city}<br>
    Estado: ${data.state}<br>
    CEP: ${data.cep}<br>
    Email: ${data.email}<br>
    Telefone: ${data.phone}
    </p>

    <h2>DADOS DO PLANO</h2>
    <p>
    Nome do Plano: ${data.planName}<br>
    Valor: R$ ${data.planValue.toFixed(2)}<br>
    Velocidade Download: ${data.downloadSpeed} Mbps<br>
    Velocidade Upload: ${data.uploadSpeed} Mbps<br>
    Data de Instalação: ${data.installationDate}
    </p>

    <p style="margin-top: 40px; text-align: center;">
    Arroio do Sal, ${currentDate}
    </p>

    <div style="margin-top: 60px; text-align: center;">
    _______________________________________________<br>
    CONECTE TELECOM LTDA
    </div>

    <div style="margin-top: 40px; text-align: center;">
    _______________________________________________<br>
    ${data.clientName}<br>
    ${data.cpf}
    </div>
  `;
};

const generatePermanenciaTemplate = (data: DocumentEditorProps['contractData']) => {
  const currentDate = new Date().toLocaleDateString('pt-BR');
  const valorDesconto = 50.00;
  const mesesFidelidade = 12;
  const valorTotalBeneficios = valorDesconto * mesesFidelidade;

  return `
    <h1 style="text-align: center; margin-bottom: 20px;">CONTRATO DE PERMANÊNCIA</h1>

    <p>Por este instrumento, ${data.clientName}, inscrito no RG de nº${data.rg}, e no CPF sob o nº ${data.cpf}, 
    residente e domiciliado na ${data.address}, ${data.city} - ${data.state}, ${data.cep}, Brasil, denominado ASSINANTE, 
    que contratou o Serviço de Comunicação Multimídia, Serviço de Valor Adicionado, Locação e Outras Avenças, 
    ofertado por CONECTE TELECOM LTDA, nome fantasia CONECTE TELECOM, pessoa jurídica de direito privado, 
    inscrita no CNPJ sob o nº. 41.143.126/0001-00, com sede na Rua Paulista, nº 183, Sala 03, Bairro Centro, 
    CEP: 95585-000, na cidade Arroio do Sal, Estado de Rio Grande do Sul, autorizada pela Anatel para explorar 
    o Serviço de Comunicação Multimídia pelo Ato nº. 3423 de 14 de maio de 2021, na modalidade avulsa ou conjunta, 
    ora formalizam os benefícios concedidos, mediante compromisso de fidelização.</p>

    <h2>1. OBJETO DO CONTRATO</h2>
    <p>Plano: ${data.planName} (R$${data.planValue.toFixed(2)})<br>
    Origem do desconto: Ativação<br>
    Valor com fidelidade: ${data.planValue.toFixed(2)}</p>

    <h2>TABELA MULTA RESCISÃO ANTECIPADA</h2>
    <p>Desconto proporcional mensal Mensalidade: R$ ${valorDesconto.toFixed(2)}<br>
    Valor total dos benefícios concedidos: R$ ${valorTotalBeneficios.toFixed(2)}</p>

    <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
      <tr>
        <th style="border: 1px solid black; padding: 8px;">Mês de Uso</th>
        <th style="border: 1px solid black; padding: 8px;">Valor da Multa</th>
      </tr>
      ${Array.from({ length: 12 }, (_, i) => {
        const mesesRestantes = 12 - i;
        const valorMulta = valorDesconto * mesesRestantes;
        return `
          <tr>
            <td style="border: 1px solid black; padding: 8px;">Com ${i + 1} ${i === 0 ? 'mês' : 'meses'} de uso</td>
            <td style="border: 1px solid black; padding: 8px;">R$ ${valorMulta.toFixed(2)}</td>
          </tr>
        `;
      }).join('')}
    </table>

    <p style="margin-top: 40px; text-align: center;">
    Arroio do Sal, ${currentDate}
    </p>

    <div style="margin-top: 60px; text-align: center;">
    _______________________________________________<br>
    CONECTE TELECOM LTDA
    </div>

    <div style="margin-top: 40px; text-align: center;">
    _______________________________________________<br>
    ${data.clientName}<br>
    ${data.cpf}
    </div>
  `;
};

export default DocumentEditor;
