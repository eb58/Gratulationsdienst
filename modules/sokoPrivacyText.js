import { escapeHtml } from './utils.js';

export const SOKO_PRIVACY_TEXT = String.raw`
  Das Soko-Mitglied hat die betroffene Person darauf hingewiesen, dass
  die im Rahmen der vorstehend genannten Zwecke erhobenen personenbezogenen Daten unter
  Beachtung der EU-Datenschutzgrundverordnung und des Berliner Datenschutzgesetzes erhoben,
  verarbeitet und genutzt werden. Zudem wurde darauf hingewiesen, dass die Erhebung,
  Verarbeitung und Nutzung ihrer Daten auf freiwilliger Basis erfolgt und die Einwilligung auch
  verweigert werden kann. Die Verweigerung der Einwilligung führt dazu, dass keine Pressemitteilung
  veröffentlicht wird. Es besteht jederzeit die Möglichkeit, die Einwilligung zu widerrufen. Mit der
  Unterschrift des Soko-Mitglieds wird bestätigt, dass die Einwilligung zur Verarbeitung der Daten
  gegeben wurde.
`.replace(/\s+/g, ' ').trim();

export const SOKO_PRIVACY_TEXT_HTML = escapeHtml(SOKO_PRIVACY_TEXT);
