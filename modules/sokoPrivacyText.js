const htmlLines = [
  'Die Soko-Mitarbeiterin/der Soko-Mitarbeiter hat die Jubilarin/den Jubilar darauf hingewiesen, dass',
  'die im Rahmen der vorstehend genannten Zwecke erhobenen pers&ouml;nlichen Daten Ihrer Person unter',
  'Beachtung der EU-Datenschutzgrundverordnung und des Berliner Datenschutzgesetzes erhoben,',
  'verarbeitet und genutzt werden. Sie sind zudem darauf hingewiesen worden, dass die Erhebung,',
  'Verarbeitung und Nutzung Ihrer Daten auf freiwilliger Basis erfolgt und die Einwilligung auch',
  'verweigert werden kann. Die Verweigerung der Einwilligung f&uuml;hrt dazu, dass keine Pressemitteilung',
  'ver&ouml;ffentlicht wird. Es besteht jederzeit die M&ouml;glichkeit, die Einwilligung zu widerrufen. Mit der',
  'Unterschrift der Soko-Mitarbeiterin/des Soko-Mitarbeiters wird best&auml;tigt, dass die Einwilligung zur',
  'Verarbeitung der personenbezogenen Daten m&uuml;ndlich/telefonisch gegeben wurde.'
];
const decodeHtmlEntities = value => value
  .replaceAll('&ouml;', 'ö')
  .replaceAll('&uuml;', 'ü')
  .replaceAll('&auml;', 'ä');

export const SOKO_PRIVACY_TEXT_HTML = htmlLines.join('\n');
export const SOKO_PRIVACY_TEXT = htmlLines.map(decodeHtmlEntities).join('\n');
