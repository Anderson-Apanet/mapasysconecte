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

    // Criar um container temporário para o PDF
    const tempContainer = document.createElement('div');
    tempContainer.innerHTML = element.querySelector('.ql-editor')?.innerHTML || '';
    
    // Aplicar estilos específicos para o PDF
    const style = document.createElement('style');
    style.textContent = `
      * {
        -webkit-print-color-adjust: exact !important;
        color-adjust: exact !important;
      }
      div {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 10px !important;
      }
      p {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-bottom: 10px !important;
        font-size: 12px !important;
        line-height: 1.5 !important;
      }
      h1, h2, h3, h4, h5, h6 {
        page-break-after: avoid !important;
        break-after: avoid !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        margin-top: 16px !important;
        margin-bottom: 8px !important;
        font-size: 14px !important;
      }
    `;
    tempContainer.appendChild(style);

    // Processar o conteúdo para garantir quebras de página adequadas
    const paragraphs = tempContainer.querySelectorAll('p, div');
    paragraphs.forEach(p => {
      p.style.setProperty('page-break-inside', 'avoid', 'important');
      p.style.setProperty('break-inside', 'avoid', 'important');
      p.style.setProperty('margin-bottom', '10px', 'important');
    });

    const opt = {
      margin: [1, 0.5, 1, 0.5],
      filename: `contrato_${documentType}_${contractData.clientName}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true,
        letterRendering: true,
        allowTaint: true
      },
      jsPDF: { 
        unit: 'in', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true,
        precision: 16
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: ['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6']
      }
    };

    try {
      await html2pdf().set(opt).from(tempContainer).save();
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
                  className="text-gray-400 hover:text-gray-500"
                >
                  <span className="sr-only">Fechar</span>
                  &times;
                </button>
              </div>
            </div>
            
            <div 
              id="document-content" 
              className="document-content"
              style={{ 
                fontSize: '12px',
                lineHeight: '1.5',
                padding: '20px'
              }}
            >
              <style>
                {`
                  .ql-editor {
                    min-height: 29.7cm;
                    padding: 2cm;
                    box-sizing: border-box;
                    line-height: 1.5 !important;
                  }
                  .ql-editor p {
                    margin-bottom: 10px !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                  .ql-editor h1, 
                  .ql-editor h2, 
                  .ql-editor h3 {
                    page-break-after: avoid !important;
                    break-after: avoid !important;
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                    margin-top: 16px !important;
                    margin-bottom: 8px !important;
                  }
                  .ql-editor > * {
                    page-break-inside: avoid !important;
                    break-inside: avoid !important;
                  }
                `}
              </style>
              <ReactQuill
                value={content}
                onChange={setContent}
                modules={{
                  toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                    [{ 'align': [] }],
                    ['clean']
                  ]
                }}
                formats={[
                  'header',
                  'bold', 'italic', 'underline',
                  'list', 'bullet',
                  'align'
                ]}
                style={{ 
                  height: 'calc(100vh - 250px)',
                  marginBottom: '20px'
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const generateAdesaoTemplate = (data: DocumentEditorProps['contractData']) => {
  return `
    <h2>CONTRATO DE ADESÃO AO SERVIÇO DE INTERNET</h2>

    Por este instrumento particular, de um lado a empresa PROVEDOR DE INTERNET LTDA, inscrita no CNPJ sob o nº XX.XXX.XXX/XXXX-XX, com sede na Rua XXXXX, nº XXX, Bairro XXXXX, Cidade - Estado, doravante denominada CONTRATADA, e de outro lado ${data.clientName}, inscrito(a) no CPF/CNPJ sob o nº ${data.cpf}, RG nº ${data.rg}, residente e domiciliado(a) na ${data.address}, ${data.city} - ${data.state}, CEP ${data.cep}, e-mail ${data.email}, telefone ${data.phone}, doravante denominado(a) CONTRATANTE, têm entre si justo e contratado o seguinte:

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
    Arroio do Sal, ${new Date().toLocaleDateString('pt-BR')}
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
  const valorDesconto = 50.00;
  const mesesFidelidade = 12;
  const valorTotalBeneficios = valorDesconto * mesesFidelidade;

  return `
    <h2>CONTRATO DE PERMANÊNCIA</h2>

    Pelo presente instrumento particular, ${data.clientName}, inscrito(a) no CPF/CNPJ sob o nº ${data.cpf}, já qualificado(a) no Contrato de Prestação de Serviços de Internet, firma o presente Contrato de Permanência, que se regerá mediante as seguintes cláusulas e condições:

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
    Arroio do Sal, ${new Date().toLocaleDateString('pt-BR')}
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
