import { supabase } from './supabase';

// Função auxiliar para determinar o tipo MIME
const getMimeType = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const mimeTypes: { [key: string]: string } = {
    'ret': 'application/octet-stream',
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'xls': 'application/vnd.ms-excel',
    'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'png': 'image/png',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'gif': 'image/gif'
  };
  
  return mimeTypes[ext || ''] || 'application/octet-stream';
};

export const uploadFile = async (file: File, bucket: string = 'assets-mapasys') => {
  try {
    // Criar um nome único para o arquivo
    const timestamp = new Date().getTime();
    const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${timestamp}-${safeFileName}`;
    
    // Determinar o tipo MIME
    const contentType = getMimeType(file.name);
    
    console.log('Iniciando upload:', {
      fileName,
      contentType,
      size: file.size,
      bucket
    });

    // Converter o arquivo para Blob com o tipo MIME correto
    const blob = new Blob([file], { type: contentType });

    // Upload do arquivo
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Erro no upload:', error);
      throw error;
    }

    if (!data?.path) {
      throw new Error('Upload realizado mas caminho do arquivo não retornado');
    }

    // Gerar URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(data.path);

    console.log('Upload concluído:', {
      path: data.path,
      url: publicUrl
    });

    return {
      path: data.path,
      url: publicUrl
    };
  } catch (error) {
    console.error('Erro no upload:', error);
    throw error;
  }
};

export const deleteFile = async (path: string, bucket: string = 'assets-mapasys') => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([path]);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error('Erro ao deletar arquivo:', error);
    throw error;
  }
};
