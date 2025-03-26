export const formatDate = (date: string | Date): string => {
  if (!date) return '';
  
  // Se for uma string, precisamos garantir que a data seja interpretada corretamente
  if (typeof date === 'string') {
    // Verifica se a data está no formato ISO (YYYY-MM-DD)
    const isISODate = /^\d{4}-\d{2}-\d{2}/.test(date);
    
    if (isISODate) {
      // Para datas ISO, ajustamos para o fuso horário local para evitar problemas com UTC
      const [year, month, day] = date.substring(0, 10).split('-').map(Number);
      return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
    }
  }
  
  // Caso não seja uma string ISO ou já seja um objeto Date
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
};
