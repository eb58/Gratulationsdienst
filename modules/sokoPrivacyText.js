import { escapeHtml } from './utils.js';

const lines = [
  'Die Soko-Mitarbeiterin/der Soko-Mitarbeiter hat die Jubilarin/den Jubilar darauf hingewiesen, dass',
  'die im Rahmen der vorstehend genannten Zwecke erhobenen persönlichen Daten Ihrer Person unter',
  'Beachtung der EU-Datenschutzgrundverordnung und des Berliner Datenschutzgesetzes erhoben,',
  'verarbeitet und genutzt werden. Sie sind zudem darauf hingewiesen worden, dass die Erhebung,',
  'Verarbeitung und Nutzung Ihrer Daten auf freiwilliger Basis erfolgt und die Einwilligung auch',
  'verweigert werden kann. Die Verweigerung der Einwilligung führt dazu, dass keine Pressemitteilung',
  'veröffentlicht wird. Es besteht jederzeit die Möglichkeit, die Einwilligung zu widerrufen. Mit der',
  'Unterschrift der Soko-Mitarbeiterin/des Soko-Mitarbeiters wird bestätigt, dass die Einwilligung zur',
  'Verarbeitung der personenbezogenen Daten mündlich/telefonisch gegeben wurde.'
];

export const SOKO_PRIVACY_TEXT = lines.join('\n');
export const SOKO_PRIVACY_TEXT_HTML = lines.map(escapeHtml).join('\n');
