import { File } from 'expo-file-system';
import { Platform } from 'react-native';

export interface LocalFile {
  uri: string;
  name: string;
  type: string;
}

// Adiciona um arquivo local (ex: foto do ImagePicker) ao FormData.
// O fetch do Expo (expo/fetch) só envia Blob/File: o formato antigo do React Native
// ({ uri, name, type }) falha antes de sair do aparelho, com "Unsupported FormDataPart implementation".
export async function appendFile(form: FormData, field: string, file: LocalFile) {
  if (Platform.OS === 'web') {
    const blob = await (await fetch(file.uri)).blob();
    form.append(field, blob, file.name);
    return;
  }
  form.append(field, new File(file.uri) as unknown as Blob);
}
