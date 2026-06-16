/**
 * SOKO-Zuordnung für Straßen und Hausnummern im Bezirk Reinickendorf.
 * Quelle: Straßenverzeichnis, Stand 09.06.2026, Seiten 2-26.
 *
 * F = fortlaufende Hausnummern, G = gerade, U = ungerade.
 * SOKO-Codes bleiben Strings, damit führende Nullen erhalten bleiben.
 */
const SOKO_STRASSENVERZEICHNIS = Object.freeze({
  "Ackerplanweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Adelheidallee": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "AEG - Siedlung": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "AEG-Siedlung Heimat": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Aegirstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Agathenweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Albtalweg": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Alemannenstr.": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "2", bis: "6A", art: "G" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "60", bis: "114", art: "G" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "1", bis: "113", art: "U" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "10", bis: "54", art: "G" }
  ],
  "Allee Marie Curie (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Allee Pierre de Coubertin (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Allee St. Exupery (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Allmendeweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Almazeile": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Almutstr.": [{ plz: "13647", soko: "33", ortsteil: "Hermsdorf" }],
  "Altdammer Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Altenhofer Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Alter Bernauer Heerweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Alter Wiesenweg": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Alt-Heiligensee": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Alt-Hermsdorf": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Alt-Lübars": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Alt-Reinickendorf": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Alt-Tegel": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Alt-Wittenau": [
    { plz: "13437", soko: "25", ortsteil: "Wittenau", von: "8", bis: "14", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "15", bis: "42", art: "F" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "43", bis: "53", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "54", bis: "85A", art: "F" },
    { plz: "13437", soko: "25", ortsteil: "Wittenau", von: "86", bis: "95", art: "F" }
  ],
  "Amandastr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Am Ansitz": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Am Ausblick": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Bärensprung": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Am Biberbau": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Am Borsigturm": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Am Bürgerpark": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Amboßweg": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Am Brunnen": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Am Buchenberg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Am Buddeplatz": [{ plz: "13507", soko: "20", ortsteil: "Tegel" }],
  "Am Dachsbau": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "3", bis: "91", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "93", bis: "125", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "8", bis: "34B", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "40", bis: "122", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "126", bis: "126", art: "G" }
  ],
  "Am Dianaplatz": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Am Doggelhof": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Am Dorfanger": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Am Dominikusteich": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Am Dorfteich": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Am Eichenhain": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Amendestr.": [
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "34", bis: "77", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "1", bis: "33", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "79", bis: "109", art: "F" }
  ],
  "Am Eulenhorst": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Am Fölzberg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Freibad": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Fuchsbau": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Am Grünen Hof": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Grünen Zipfel": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Grüngürtel": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Am Hirschwechsel": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "23", art: "F" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "26", bis: "43", art: "F" }
  ],
  "Am Hügel": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Jartz": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Kahlschlag": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Kesselpfuhl": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Klauswerder": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Am Klötzgraben": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Krähenberg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Am Kringel": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Lehnshof": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Am Leitbruch": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Am Lübarser Feld": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Nordgraben": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "1", bis: "5", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "6", bis: "15", art: "F" },
    { plz: "13437", soko: "06", ortsteil: "Wittenau", von: "31", bis: "31", art: "F" }
  ],
  "Am Osrücken": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Packereigraben": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Pfingstberg": [
    { plz: "13465", soko: "36", ortsteil: "Hermsdorf", von: "1", bis: "24", art: "F" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "25", bis: "41", art: "F" }
  ],
  "Am Pilz": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Am Poloplatz": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Am Priesteracker": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Priesterberg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Querschlag": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Am Rathauspark": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Am Ried": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Am Rodelberg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Rohrbusch": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Rosenanger": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Am Rosensteg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Am Schäfersee": [
    { plz: "13407", soko: "03", ortsteil: "Reinickendorf", von: "1", bis: "67", art: "U" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "2", bis: "2", art: "G" }
  ],
  "Am Seeschloß": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Amselgrund": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Am Springebruch": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Stand": [{ plz: "13409", soko: "06", ortsteil: "Reinickendorf" }],
  "Am Steinbergpark": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Südfeld": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Am Tegeler Hafen": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Am Tegelgrund": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Am Triftpark": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Am Unterholz": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Am Vierrutenberg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Am Waidmannseck": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Am Waldidyll": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Am Waldpark": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Am Wechsel": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Am Wiesenende": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "An den Fließtalhöfen": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "An der Aussicht": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "An der Buche": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "8", art: "F" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "10", bis: "25", art: "F" }
  ],
  "An der Hasenfurt": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "19A", art: "F" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "20", bis: "40", art: "F" }
  ],
  "An der Heide": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "An der Koppel": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "An der Krähenheide": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "An der Kremmener Bahn": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "An der Mäckeritzbrücke": [{ plz: "13629", soko: "12", ortsteil: "Reinickendorf" }],
  "An der Malche": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "An der Mühle": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "An der Oberrealschule": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "An der Oberrealschule .": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "An der Schneise": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "57", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "84A", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "63", bis: "73", art: "U" }
  ],
  "An der Wildbahn": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "55A", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "30", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "57", bis: "135", art: "U" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "32", bis: "112", art: "G" }
  ],
  "Andornsteig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Angersbacher Pfad": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Anglersiedlung": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Ansgarstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Antonienstr.": [
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "1", bis: "17", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "18", bis: "51", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "52", bis: "68", art: "F" }
  ],
  "Ariadnestr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Armbrustweg": [
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "1", bis: "9", art: "U" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "2", bis: "22", art: "G" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "11", bis: "21", art: "U" }
  ],
  "Arnheidstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Aroser Allee": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "60", bis: "84", art: "G" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "122", bis: "154", art: "G" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "63", bis: "181", art: "U" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "86", bis: "118", art: "G" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "170", bis: "200", art: "G" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "183", bis: "195", art: "U" }
  ],
  "Artemisstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Artuswall": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Ascheberger Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Askaloner Weg": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Attendorner Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Auber Steig": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Auf dem Mühlenberg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Auguste-Viktoria-Allee": [
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "1", bis: "17A", art: "F" },
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "18", bis: "23", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "25", bis: "28B", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "29", bis: "54C", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "54", bis: "75", art: "F" },
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "76", bis: "103", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "104", bis: "999", art: "F" }
  ],
  "Auguste-Viktoria-Str.": [{ plz: "13467", soko: "33", ortsteil: "Reinickendorf" }],
  "Avenue Charles de Gaulle (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Avenue Jean Mermoz (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Baaber Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Backnanger Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Bad-Steben-Str.": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Bärbelweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Barnabasstr.": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Barschelplatz": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Barthstr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Basdorfer Zeile": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Baseler Str.": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "2", bis: "40", art: "G" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "27", bis: "59", art: "U" }
  ],
  "Basiliusweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Baummardersteig": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Beatestr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Becherweg": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Beckumer Str.": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Bei den Wörden": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Bekassinenweg": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "37", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "4", bis: "24", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "26", bis: "34", art: "G" }
  ],
  "Belowstr.": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Benediktinerstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Benekendorffstr.": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "1", bis: "83", art: "F" },
    { plz: "13469", soko: "32", ortsteil: "Waidmannslust", von: "84", bis: "235", art: "F" }
  ],
  "Berenhorststr.": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Bergemannweg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Bergfelder Weg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Bergstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Berliner Str.": [
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "1", bis: "71", art: "F" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "72", bis: "94", art: "F" },
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "99", bis: "145", art: "F" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "1", bis: "37", art: "F" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "38", bis: "55B", art: "F" },
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "66", bis: "68", art: "F" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "70", bis: "94", art: "F" },
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "95", bis: "105", art: "F" }
  ],
  "Bernauer Str.": [
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "7", bis: "151", art: "U" },
    { plz: "13629", soko: "12", ortsteil: "Tegel", von: "171", bis: "197Z", art: "U" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "2", bis: "140", art: "G" },
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "142", bis: "165", art: "G" }
  ],
  "Bernhard-Lichtenberg-Platz": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Bernshausener Ring": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Bernstorffstr.": [{ plz: "13507", soko: "23", ortsteil: "Tegel" }],
  "Bertastr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Bertramstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Betzdorfer Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Beyschlagstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Biedenkopfer Str.": [
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "1", bis: "69", art: "U" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "2", bis: "22", art: "G" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "42", bis: "66", art: "G" }
  ],
  "Bieler Str.": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Bieselheider Weg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Bifröstweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Billerbecker Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Bilsenkrautstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Birkenwerderstr.": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Bisonweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Bläßhuhnweg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Blankestr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Blesener Zeile": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Blitzenroder Ring": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Blomberger Weg": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Blunckstr.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Bocholter Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Bölkauer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Bohnsacker Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Bollestr.": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Bondickstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Bonifaziusstr.": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Borgfelder Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Borggrevestr.": [
    { plz: "13403", soko: "07", ortsteil: "Reinickendorf", von: "3", bis: "23", art: "U" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "4", bis: "16", art: "G" }
  ],
  "Borgsdorfer Str.": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Borkener Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Bornepfad": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Borsigdamm": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Borsighafen": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Borsigwalder Weg": [
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "1", bis: "79", art: "U" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "2", bis: "46", art: "G" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "50", bis: "88", art: "G" }
  ],
  "Bottroper Weg": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Boumannstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Brandtstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Breckerfelder Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Breitachzeile": [{ plz: "13509", soko: "20", ortsteil: "Tegel" }],
  "Breitenbachstr.": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Breitkopfstr.": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "38", bis: "59", art: "F" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "61", bis: "109", art: "U" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "62", bis: "88", art: "G" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "92", bis: "102", art: "G" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "119", bis: "140", art: "F" }
  ],
  "Brienzer Str.": [
    { plz: "13407", soko: "03", ortsteil: "Reinickendorf", von: "26", bis: "56", art: "G" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "43", bis: "59", art: "U" }
  ],
  "Brodersenstr.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Brunowplatz": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Brunowstr.": [
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "2", bis: "9", art: "F" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "10", bis: "52", art: "F" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "53", bis: "62", art: "F" }
  ],
  "Brusebergstr.": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Buddestr.": [
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "1", bis: "11", art: "U" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "2", bis: "18", art: "G" },
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "13", bis: "35", art: "U" },
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "20", bis: "40", art: "G" }
  ],
  "Büchenbronner Steig": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Büchsenweg": [{ plz: "13409", soko: "06", ortsteil: "Reinickendorf" }],
  "Büdnerring": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Bürgersruh": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Bürgerstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Büssower Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Büsumer Pfad": [
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "1", bis: "5", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "4", bis: "8", art: "G" }
  ],
  "Bulgenbachweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Bundschuhweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Buntspechtstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Burgfrauenstr.": [
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "3", bis: "11", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "11", bis: "51A", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Hermsdorf", von: "53", bis: "133", art: "F" }
  ],
  "Calauer Str.": [{ plz: "13435", soko: "31", ortsteil: "Wittenau" }],
  "Calvinstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Campestr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Cecilienallee": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Cecilienplatz": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Coesfelder Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Conradstr.": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "1", bis: "31", art: "F" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "32", bis: "78", art: "F" }
  ],
  "Creienfelder Weg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Criolloweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Cyclopstr.": [
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "1", bis: "7", art: "F" },
    { plz: "13469", soko: "24", ortsteil: "Wittenau", von: "8", bis: "27", art: "F" }
  ],
  "Dacheroedenstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Dahnstr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Dambockstr.": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "53", art: "F" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "54", bis: "76", art: "F" }
  ],
  "Damkitzstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Damwildsteig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Dannenwalder Weg": [
    { plz: "13439", soko: "27", ortsteil: "Wittenau", von: "2", bis: "68", art: "F" },
    { plz: "13439", soko: "28", ortsteil: "Wittenau", von: "69", bis: "196", art: "F" }
  ],
  "Darsiner Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Dattelner Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Deeper Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Deilingeweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Der Zwinger": [
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "3", bis: "3", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "4", bis: "10", art: "G" }
  ],
  "Desideriusweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Dessinstr.": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Deutsche Str.": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Diakonieweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Dianaplatz": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Dianastr.": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "1", bis: "6A", art: "F" },
    { plz: "13469", soko: "24", ortsteil: "Waidmannslust", von: "7", bis: "81", art: "F" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "82", bis: "84", art: "F" }
  ],
  "Dietrichinger Weg": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Dinkelsbühler Steig": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Dohlenstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Dohnensteig": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Donnersmarckallee": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Donnersmarckplatz": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Dorndreherweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Drebkauer Str.": [{ plz: "13439", soko: "27", ortsteil: "Wittenau" }],
  "Dreifelderweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Drenziger Zeile": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Drewitzer Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Drostestr.": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "1", bis: "12", art: "F" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "13", bis: "22A", art: "F" }
  ],
  "Dübelpfad": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Dülmener Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Dünenweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Düsterhauptstr.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Edelhofdamm": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Edeltrautweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Egellsstr.": [
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "1", bis: "17", art: "U" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "2", bis: "22", art: "G" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "21", bis: "21", art: "U" }
  ],
  "Egidystr.": [
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "1", bis: "17", art: "F" },
    { plz: "13509", soko: "34", ortsteil: "Tegel", von: "19", bis: "65", art: "F" }
  ],
  "Ehrenpfortensteig": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Eichborndamm": [
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "1", bis: "37", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "38", bis: "100", art: "F" },
    { plz: "13403", soko: "21", ortsteil: "Wittenau", von: "100", bis: "206", art: "G" },
    { plz: "13403", soko: "21", ortsteil: "Wittenau", von: "103", bis: "209", art: "U" },
    { plz: "13403", soko: "22", ortsteil: "Wittenau", von: "208", bis: "210", art: "G" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "214", bis: "298", art: "G" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "215", bis: "263", art: "U" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "265", bis: "297", art: "U" }
  ],
  "Eichelhäherstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Eichenroder Ring": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Eichhorster Weg": [
    { plz: "13435", soko: "27", ortsteil: "Wittenau", von: "1", bis: "46", art: "F" },
    { plz: "13435", soko: "25", ortsteil: "Wittenau", von: "47", bis: "96", art: "F" }
  ],
  "Eichstädter Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Eisbärenweg": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Eisenhammerweg": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Eisenhartsteig": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Elchdamm": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Elkesteig": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Elsenbruchstr.": [
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "1", bis: "29", art: "F" },
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "33", bis: "54A", art: "F" }
  ],
  "Elsenpfuhlstr.": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Elsestr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Elstergasse": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Eltviller Str.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Emmentaler Str.": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "3", bis: "87", art: "U" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "91", bis: "131", art: "U" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "147", bis: "153", art: "U" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "2", bis: "12", art: "G" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "40", bis: "88", art: "G" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "90", bis: "108", art: "G" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "110", bis: "164", art: "G" }
  ],
  "Emstaler Platz": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Engelmannweg": [
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "1", bis: "62", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "63", bis: "86", art: "F" }
  ],
  "Engelroder Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Enkircher Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Epensteinplatz": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Epensteinstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Erholungsweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Erich-Anger-Weg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Erlenweg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Erndtebrücker Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Ernststr.": [
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "1", bis: "13", art: "U" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "21", bis: "67", art: "U" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "69", bis: "97", art: "U" },
    { plz: "13509", soko: "13", ortsteil: "Tegel", von: "2", bis: "14", art: "G" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "20", bis: "96", art: "G" }
  ],
  "Eschachstr.": [
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "58", bis: "62", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "66", bis: "76", art: "G" }
  ],
  "Ettenheimer Pfad": [{ plz: "13469", soko: "25", ortsteil: "Waidmannslust" }],
  "Eutinger Weg": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Fährstr.": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Fäustelweg": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Falkenhorststr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Falkenplatz": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Falkentaler Steig": [
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "1", bis: "97", art: "F" },
    { plz: "13465", soko: "35", ortsteil: "Hermsdorf", von: "98", bis: "145", art: "F" }
  ],
  "Alte Fasanerie": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Fasanerie": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Feldspatzenweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Feldlerchenweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Feldmarkweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Fellbacher Platz": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Fellbacher Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Fetschowzeile": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Feuerweg": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Fichtestr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Finnentroper Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Finsterwalder Str.": [
    { plz: "13435", soko: "27", ortsteil: "Wittenau", von: "1", bis: "33", art: "U" },
    { plz: "13435", soko: "27", ortsteil: "Wittenau", von: "2", bis: "62", art: "G" },
    { plz: "13435", soko: "25", ortsteil: "Wittenau", von: "61", bis: "73", art: "U" },
    { plz: "13435", soko: "31", ortsteil: "Wittenau", von: "64", bis: "102A", art: "G" },
    { plz: "13435", soko: "32", ortsteil: "Wittenau" }
  ],
  "Fließtalstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Flötnerweg": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Flohrstr.": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Florastr.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Flottenstr.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Flughafensee": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Flughafen Tegel": [{ plz: "13405", soko: "12", ortsteil: "Tegel" }],
  "Fontanestr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Forlenweg": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Forststr.": [
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "1", bis: "23", art: "U" },
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "2", bis: "28B", art: "G" },
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "25", bis: "61", art: "U" },
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "30", bis: "76", art: "G" }
  ],
  "Forstweg": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "37A", art: "F" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "38", bis: "99", art: "F" }
  ],
  "Foxweg": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Fräsersteig": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Frankendorfer Steig": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Freester Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Freiheitsweg": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Freiherr-vom-Stein-Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Freilandweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Friederikestr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Friedrich-Karl-Str.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Friedrichsthaler Weg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Friedrich-Wilhelm-Str.": [{ plz: "13409", soko: "04", ortsteil: "Reinickendorf" }],
  "Frischborner Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Frohnauer Str.": [
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "1", bis: "105", art: "F" },
    { plz: "13465", soko: "35", ortsteil: "Hermsdorf", von: "106", bis: "111", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Hermsdorf", von: "112", bis: "154", art: "F" },
    { plz: "13465", soko: "37", ortsteil: "Hermsdorf", von: "155", bis: "168", art: "F" }
  ],
  "Frommpromenade": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Fuchsring": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Fuchsschwanzweg": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Fuchssteinerweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Fürst-Bismarck-Str.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Fürstenauer Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Fürstendamm": [
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "1", bis: "5", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "6", bis: "35", art: "F" },
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "38", bis: "45", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "47", bis: "59", art: "F" },
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "60", bis: "68", art: "F" }
  ],
  "Gabelweihstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Gabrielenstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Gambiner Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Gamsbartweg": [{ plz: "13409", soko: "04", ortsteil: "Reinickendorf" }],
  "Gandenitzer Weg": [{ plz: "13439", soko: "29", ortsteil: "Wittenau" }],
  "Gawanstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Gedonstr.": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Geierpfad": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Gemsenpfad": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "General-Barby-Str.": [
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "1", bis: "77C", art: "U" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "2", bis: "72", art: "G" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "74", bis: "78B", art: "G" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "80", bis: "136", art: "F" }
  ],
  "General-Woyna-Str.": [
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "1", bis: "40A", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "41", bis: "48", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "49", bis: "66", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "67", bis: "72", art: "F" }
  ],
  "Genfer Str.": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Gerlindeweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Germendorfer Str.": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Gertrudstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Gesellschaftstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Getreideweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Gisbertasteig": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Glambecker Weg": [
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "2", bis: "37", art: "F" },
    { plz: "13465", soko: "35", ortsteil: "Hermsdorf", von: "38", bis: "43A", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "44", bis: "45", art: "F" }
  ],
  "Glaskrautstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Glienicker Str.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Göschenplatz": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Göschenstr.": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Götzestr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Gollanczstr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Gorkistr.": [
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "1", bis: "21A", art: "F" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "22", bis: "24", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "23", bis: "153", art: "U" },
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "26", bis: "70", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "72", bis: "154", art: "G" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "159", bis: "227", art: "F" }
  ],
  "Gotthardstr.": [
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "1", bis: "25", art: "U" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "4", bis: "72", art: "G" },
    { plz: "13407", soko: "08", ortsteil: "Reinickendorf", von: "27", bis: "37", art: "U" },
    { plz: "13407", soko: "08", ortsteil: "Reinickendorf", von: "74", bis: "91", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "92", bis: "107", art: "F" }
  ],
  "Graf-Haeseler-Str.": [{ plz: "13403", soko: "10", ortsteil: "Reinickendorf" }],
  "Gralsburgsteig": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Gralsritterweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Granatenstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Graneweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Grebenhainer Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Greenwichpromenade": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Grimbartsteig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Grindelwaldweg": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Große Malche": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Großkopfstr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Grünlandweg": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Grünrockweg": [
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "1", bis: "11", art: "U" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "2", bis: "12", art: "G" }
  ],
  "Grünspechtweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Grußdorfstr.": [
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "1", bis: "11", art: "F" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "12", bis: "19", art: "F" }
  ],
  "Güttlandring": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Guhlener Zeile": [{ plz: "13435", soko: "27", ortsteil: "Wittenau" }],
  "Gurnemanzpfad": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Gutachstr.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Gutshofstr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Habichtstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Hademarscher Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Haflingerpfad": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Hafflingerpfad": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Hainbuchenstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Halalistr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Hallichpromenade": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Halligweg": [{ plz: "13599", soko: "12", ortsteil: "Tegel" }],
  "Hambacher Weg": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Hangweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Haselhuhnweg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Hasselwerder (Insel)": [{ plz: "13505", soko: "15", ortsteil: "Tegel" }],
  "Haßlingerweg": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Hattenheimer Str.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Hattinger Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Hatzfeldtallee": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Hausotterplatz": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Hausotterstr.": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "2", bis: "31A", art: "F" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "32", bis: "73", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "74", bis: "103", art: "F" }
  ],
  "Havelmüllerweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Hechelstr.": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Hedwigstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Heerruferweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Heidenheimer Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Heidestr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Heiligenseestr.": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "201", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "162A", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "168", bis: "202", art: "G" }
  ],
  "Heiligental": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Heinsestr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Helgaweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Helmkrautstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Helweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Hemmingstedter Weg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Hennigsdorfer Str.": [
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "1", bis: "89", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "2", bis: "58", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "62", bis: "90", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "91", bis: "170", art: "F" }
  ],
  "Henricistr.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Herbsteiner Str.": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Herbststr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Hermann-Piper-Str.": [
    { plz: "13403", soko: "21", ortsteil: "Wittenau", von: "2", bis: "22", art: "G" },
    { plz: "13403", soko: "22", ortsteil: "Wittenau", von: "11", bis: "41", art: "U" }
  ],
  "Hermsdorfer Damm": [
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "22", bis: "96", art: "G" },
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "25", bis: "93A", art: "U" },
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "95", bis: "183", art: "U" },
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "98", bis: "182", art: "G" },
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "184", bis: "250", art: "G" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "185", bis: "221", art: "U" },
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "223", bis: "239", art: "U" }
  ],
  "Hermsdorfer Str.": [
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "1", bis: "8", art: "F" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "13", bis: "14", art: "F" },
    { plz: "13469", soko: "24", ortsteil: "Wittenau", von: "18", bis: "32", art: "F" },
    { plz: "13437", soko: "25", ortsteil: "Wittenau", von: "36", bis: "53A", art: "F" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "55", bis: "55", art: "F" },
    { plz: "13469", soko: "24", ortsteil: "Wittenau", von: "56", bis: "69", art: "F" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "70", bis: "104", art: "F" }
  ],
  "Herrnholzweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Herscheider Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Hieronymusweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Hilchenbacher Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Hillmannstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Hinter der Dorfaue": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Hochjagdstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Höllentalweg": [{ plz: "13469", soko: "25", ortsteil: "Waidmannslust" }],
  "Höpfertsteig": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Hofjägerallee": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Hohefeldstr.": [{ plz: "13467", soko: "36", ortsteil: "Hermsdorf" }],
  "Hohenheimer Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Hohenzollernstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Holländerstr.": [
    { plz: "13407", soko: "03", ortsteil: "Reinickendorf", von: "2", bis: "16", art: "F" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "17", bis: "34A", art: "F" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "35", bis: "36B", art: "F" },
    { plz: "13407", soko: "08", ortsteil: "Reinickendorf", von: "37", bis: "53", art: "F" },
    { plz: "13407", soko: "03", ortsteil: "Reinickendorf", von: "113", bis: "132", art: "F" }
  ],
  "Holwedestr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Holzhauser Str.": [
    { plz: "13509", soko: "13", ortsteil: "Tegel", von: "1", bis: "50", art: "F" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "51", bis: "190", art: "F" }
  ],
  "Holzweidepfad": [{ plz: "13403", soko: "07", ortsteil: "Reinickendorf" }],
  "Hoppestr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Horandweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Horber Str.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Hubertusstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Hubertusweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Humannstr.": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Humboldtinsel": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Humboldtstr.": [
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "1", bis: "21", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "22", bis: "89", art: "F" },
    { plz: "13407", soko: "08", ortsteil: "Reinickendorf" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "91", bis: "104A", art: "F" }
  ],
  "Huttenstr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Huttwiler Weg": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "1", bis: "37", art: "F" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "38", bis: "48", art: "F" }
  ],
  "Ilbeshäuser Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Illerzeile": [{ plz: "13509", soko: "20", ortsteil: "Tegel" }],
  "Im Amseltal": [
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "1", bis: "8", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "10", bis: "71", art: "F" }
  ],
  "Im Brachfeldwinkel": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Im Erpelgrund": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Im Fischgrund": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Im Hufenschlag": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Im Rehgrund": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "60", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "3", bis: "77", art: "U" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "62", bis: "76", art: "G" }
  ],
  "Im Riedgrund": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Im Rodeland": [
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "1", bis: "17", art: "U" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "2", bis: "18", art: "G" }
  ],
  "Im Saatwinkel": [{ plz: "13599", soko: "12", ortsteil: "Tegel" }],
  "Im Vogtland": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Im Waldwinkel": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Im Wiesenbusch": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Im Wolfsgartenfeld": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "In den Kaveln": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "In den Schifferbergen": [{ plz: "13505", soko: "17", ortsteil: "Heiligensee" }],
  "Innungsstr.": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Interessentenweg": [{ plz: "13437", soko: "06", ortsteil: "Reinickendorf" }],
  "Invalidensiedlung": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Isegrimsteig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Jacobsenweg": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Jägerstieg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Jägerweg": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "1", bis: "6", art: "F" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "7", bis: "28", art: "F" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "29", bis: "33", art: "F" }
  ],
  "Jagowstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Jahnstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Jansenstr.": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Jathoweg": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Jean-Jaures-Str.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Jörsstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Jostweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Julierstr.": [{ plz: "13407", soko: "08", ortsteil: "Reinickendorf" }],
  "Junostr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Jupiterstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Käthestr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Kamekestr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Kamener Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Kammgasse": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Kampweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Kapweg": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Karmeliterweg": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "49", art: "U" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "2", bis: "48", art: "G" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "51", bis: "122", art: "F" }
  ],
  "Karolinenstr.": [
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "1", bis: "1F", art: "F" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "2", bis: "21A", art: "F" }
  ],
  "Karwitzer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Kasinoweg": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Katzensteg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Kehrwieder": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Keilerstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Kellenzeile": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Kettelerpfad": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Kiefheider Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Kienhorststr.": [
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "2", bis: "22", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "26", bis: "109", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "110", bis: "156", art: "G" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "111", bis: "111", art: "U" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "131", bis: "139", art: "U" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "141", bis: "165", art: "U" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "160", bis: "172", art: "G" }
  ],
  "Kieselbronner Weg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Kirchgasse": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Klamannstr.": [
    { plz: "13407", soko: "08", ortsteil: "Reinickendorf", von: "3", bis: "5A", art: "U" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "7", bis: "15", art: "U" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "2", bis: "18A", art: "G" }
  ],
  "Klaushager Weg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Kleine Brüderstraße": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Klemkestr.": [
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "1", bis: "103", art: "U" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "2", bis: "64", art: "G" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "74", bis: "88B", art: "G" }
  ],
  "Klenzepfad": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Klinnerweg": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Klixstr.": [{ plz: "13403", soko: "10", ortsteil: "Reinickendorf" }],
  "Klötzesteig": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Klosterfelder Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Klosterheider Weg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Knappenpfad": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Knauerstr.": [{ plz: "13407", soko: "07", ortsteil: "Wittenau" }],
  "Kneippstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Kniggeweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Kögelstr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Königsbacher Zeile": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Königshorster Str.": [
    { plz: "13439", soko: "30", ortsteil: "Wittenau", von: "1", bis: "10A", art: "F" },
    { plz: "13439", soko: "27", ortsteil: "Wittenau", von: "11", bis: "13", art: "U" }
  ],
  "Königsweg": [{ plz: "13507", soko: "23", ortsteil: "Tegel" }],
  "Kolpingplatz": [{ plz: "13409", soko: "06", ortsteil: "Reinickendorf" }],
  "Konradshöher Straße": [{ plz: "13505", soko: "15", ortsteil: "Konradshöhe" }],
  "Konzer Platz": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Kopenhagener Str.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Koppelweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Kornweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Kossätenstr.": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Krangener Weg": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Krantorweg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Kreuzritterstr.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Kreuztaler Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Krumminer Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Krumpuhler Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Kühleweinstr.": [
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "1", bis: "34", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "35", bis: "81", art: "U" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "64", bis: "82", art: "G" }
  ],
  "Kühnemannstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Kurfürstenstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Kurhausstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Kurt-Schumacher-Damm": [
    { plz: "13405", soko: "09", ortsteil: "Reinickendorf", von: "1", bis: "1", art: "U" },
    { plz: "13405", soko: "09", ortsteil: "Reinickendorf", von: "2", bis: "42", art: "G" },
    { plz: "13405", soko: "12", ortsteil: "Tegel", von: "44", bis: "148", art: "G" },
    { plz: "13405", soko: "09", ortsteil: "Tegel", von: "150", bis: "176", art: "G" },
    { plz: "13405", soko: "12", ortsteil: "Tegel", von: "200", bis: "246", art: "G" }
  ],
  "Kurt-Schumacher-Platz": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Kurzebracker Weg": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "1", bis: "69", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "2", bis: "68", art: "G" }
  ],
  "Kurze Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Labeser Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Lachtaubenweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Ladeburger Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Lahrer Pfad": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Lampesteig": [{ plz: "13409", soko: "06", ortsteil: "Reinickendorf" }],
  "Landenhäuser Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Lange Enden": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Langenauer Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Langohrzeile": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Laurinsteig": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Lengeder Str.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Lesewitzer Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Letmather Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Letschiner Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Letteallee": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "3", bis: "41", art: "U" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "6", bis: "48", art: "G" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "53", bis: "95", art: "F" }
  ],
  "Letteplatz": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Letzkauer Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Leuenberger Zeile": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Lichtungsweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Lichtweg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Lieberoser Str.": [{ plz: "13439", soko: "27", ortsteil: "Wittenau" }],
  "Liebfrauenweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Liebstöckelweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Lienemannstr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Lierbacher Weg": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Liesborner Weg": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Liessauer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Lindauer Allee": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "1", bis: "5", art: "U" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "7", bis: "45", art: "U" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "47", bis: "49A", art: "U" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "55", bis: "117", art: "U" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "2", bis: "48", art: "G" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "52", bis: "114", art: "G" }
  ],
  "Lipizzanerweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Lißberger Zeile": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Lobber Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Löblauer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Loerkesteig": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Lotosweg": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Lubminer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Ludolfingerplatz": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "5", art: "F" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "6", bis: "9", art: "F" }
  ],
  "Ludolfingerweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Lübarser Aue": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Lübarser Str.": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Lübener Weg": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Luisenstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Luisenweg": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Maarer Str.": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Maienwerder (Insel)": [{ plz: "13599", soko: "12", ortsteil: "Tegel" }],
  "Maienwerderweg": [{ plz: "13599", soko: "12", ortsteil: "Tegel" }],
  "Mariabrunner Weg": [
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf" }
  ],
  "Markendorfer Str.": [{ plz: "13439", soko: "27", ortsteil: "Wittenau" }],
  "Markgrafenstr.": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "90", art: "U" },
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "2", bis: "90A", art: "G" }
  ],
  "Markscheiderstr.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Markstr.": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Marlenestr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Marsstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Marthastr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Martin-Luther-Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Martin-Rudloff-Weg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Marzahnstr.": [
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "1", bis: "5", art: "U" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "2", bis: "16", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "7", bis: "23", art: "U" }
  ],
  "Mattenbuder Pfad": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "1", bis: "45", art: "U" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "4", bis: "76", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "47", bis: "75D", art: "U" }
  ],
  "Mattersburger Weg": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Mauschbacher Steig": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Max-Beckmann-Platz": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Maximiliankorso": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "15", art: "F" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "16", bis: "76", art: "F" }
  ],
  "Medebacher Weg": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Mecklenburgweg": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Mehlweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Mehringer Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Mehrower Zeile": [{ plz: "13435", soko: "27", ortsteil: "Wittenau" }],
  "Meistergasse": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Melanchthonstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Meldorfer Steig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Meller Bogen": [
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "2", bis: "16", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "17", bis: "19", art: "U" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "18", bis: "32", art: "G" }
  ],
  "Mergelweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Merkurstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Merlinweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Mescheder Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Meteorstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Michelbacher Zeile": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Mickestr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Milanstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Minheimer Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Miraustr.": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "2", bis: "127", art: "F" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "129", bis: "137", art: "F" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "138", bis: "150", art: "G" },
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "139", bis: "145", art: "U" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "147", bis: "151", art: "U" }
  ],
  "Mittelbruchzeile": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "1", bis: "67", art: "U" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "2", bis: "48", art: "G" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "50", bis: "112", art: "G" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "71", bis: "111", art: "U" }
  ],
  "Montanstr.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Moorweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Moränenweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Mottlaupfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Mudrackzeile": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Mühlenfeldstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Mühlsteinweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Mümmelmannweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Münchener Str.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Mustangweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Myrtenweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Nach der Höhe": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Nagolder Pfad": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Namslaustr.": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Nassenheider Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Neheimer Str.": [
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "1", bis: "29", art: "F" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "31", bis: "63", art: "U" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "56", bis: "56", art: "G" }
  ],
  "Neptunstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Neubrücker Str.": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "33", art: "U" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "26", bis: "86", art: "G" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "37", bis: "85", art: "U" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "87", bis: "99", art: "F" }
  ],
  "Neufährer Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Neulandweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Neuwarper Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Nibelungenstr.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Niebüller Weg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Nietheweg": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Nimrodstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Nordbahnstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Norddorfer Pfad": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Nordhellesteig": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Nordlichtstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Nußhäherstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Oberhavel": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "103", bis: "104", art: "F" },
    { plz: "13505", soko: "16", ortsteil: "Konradshöhe", von: "105", bis: "114", art: "F" }
  ],
  "Odilostr.": [{ plz: "13467", soko: "36", ortsteil: "Hermsdorf" }],
  "Oelder Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Öschelbronner Weg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Oeserstr.": [
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "1", bis: "19", art: "U" },
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "2", bis: "68", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "21", bis: "89", art: "U" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "70", bis: "86", art: "G" }
  ],
  "Oggenhauser Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Olafstr.": [
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "1", bis: "40", art: "F" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "43", bis: "92", art: "F" }
  ],
  "Olbendorfer Weg": [
    { plz: "13403", soko: "21", ortsteil: "Wittenau", von: "2", bis: "20", art: "G" },
    { plz: "13403", soko: "21", ortsteil: "Wittenau", von: "7", bis: "67", art: "U" },
    { plz: "13403", soko: "22", ortsteil: "Wittenau", von: "50", bis: "70", art: "G" }
  ],
  "Olbrichweg": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Ollenhauerstr.": [
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "1", bis: "55", art: "F" },
    { plz: "13403", soko: "07", ortsteil: "Reinickendorf", von: "56", bis: "70", art: "F" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "72", bis: "84", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "85", bis: "111", art: "F" },
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "112", bis: "140", art: "F" }
  ],
  "Olwenstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Oppenheimer Weg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Oranienburger Chaussee": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Oranienburger Str.": [
    { plz: "13437", soko: "07", ortsteil: "Wittenau", von: "1", bis: "50", art: "F" },
    { plz: "13437", soko: "25", ortsteil: "Wittenau", von: "52", bis: "181", art: "F" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "182", bis: "195", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "196", bis: "285A", art: "F" }
  ],
  "Oraniendamm": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Ortwinstr.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Osianderweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Osterwicker Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Oststr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Oswinsteig": [{ plz: "13467", soko: "36", ortsteil: "Hermsdorf" }],
  "Otisstr.": [
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "1", bis: "33", art: "U" },
    { plz: "13403", soko: "13", ortsteil: "Tegel", von: "39", bis: "69", art: "U" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "2", bis: "78", art: "G" }
  ],
  "Otternweg": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Ottilienweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Pankower Allee": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "1", bis: "45", art: "F" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "47", bis: "95", art: "U" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "46", bis: "94", art: "G" }
  ],
  "Pannwitzstr.": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Parkstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Pfadfinderweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Pfahlerstr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Pfifferlingweg": [{ plz: "13403", soko: "07", ortsteil: "Reinickendorf" }],
  "Pforzheimer Str.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Pilgersdorfer Weg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Pirschweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Place Moliere": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Platenhofer Weg": [
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "1", bis: "9", art: "U" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "4", bis: "46", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "13", bis: "45", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "48", bis: "85", art: "F" }
  ],
  "Plettenberger Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Polsumer Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Polziner Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Ponyweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Prendener Zeile": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Primusweg": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Provinzstr.": [
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "35", bis: "91", art: "F" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "92", bis: "127", art: "F" }
  ],
  "Puchertweg": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Quäkerstr.": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Quickborner Str.": [
    { plz: "13439", soko: "29", ortsteil: "Wittenau", von: "29", bis: "49", art: "U" },
    { plz: "13439", soko: "29", ortsteil: "Wittenau", von: "40", bis: "100", art: "G" },
    { plz: "13439", soko: "29", ortsteil: "Wittenau", von: "69", bis: "77", art: "U" },
    { plz: "13439", soko: "32", ortsteil: "Wittenau", von: "79", bis: "207", art: "U" },
    { plz: "13439", soko: "32", ortsteil: "Wittenau", von: "158", bis: "212", art: "G" }
  ],
  "Rabenhorststr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Rabenstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Räuschstr.": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "1", bis: "17A", art: "F" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "18", bis: "57", art: "F" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "57", bis: "74A", art: "F" }
  ],
  "Ragazer Str.": [
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "2", bis: "16", art: "F" },
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "32", bis: "47", art: "F" }
  ],
  "Rallenweg": [{ plz: "13505", soko: "17", ortsteil: "Heiligensee" }],
  "Randower Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Rappenweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Raschdorffstr.": [
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "1", bis: "25", art: "U" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "2", bis: "60", art: "G" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "29", bis: "111", art: "U" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "64", bis: "110", art: "G" }
  ],
  "Rathauspromenade": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Rauentaler Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Rauhbankzeile": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Rauhfußgasse": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Rausendorffweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Rautensteig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Rauxeler Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Regenwalder Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Reginhardstr.": [
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "1", bis: "31", art: "U" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "33", bis: "127", art: "U" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "34", bis: "126", art: "G" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "129", bis: "159", art: "U" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "130", bis: "186", art: "G" },
    { plz: "13409", soko: "01", ortsteil: "Reinickendorf", von: "165", bis: "171", art: "U" }
  ],
  "Reiherallee": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "73", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "74", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "75", bis: "83B", art: "U" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "78", bis: "96", art: "G" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "89", bis: "99A", art: "U" }
  ],
  "Reiherwerder (Halbinsel)": [{ plz: "13505", soko: "15", ortsteil: "Tegel" }],
  "Reimerswalder Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Reinickes Hof": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Remstaler Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Reppener Zeile": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Residenzstr.": [
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "1", bis: "3", art: "F" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "5", bis: "49B", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "53", bis: "92", art: "F" },
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "94", bis: "105", art: "F" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "106", bis: "126", art: "F" },
    { plz: "13409", soko: "04", ortsteil: "Reinickendorf", von: "127", bis: "145", art: "F" },
    { plz: "13409", soko: "06", ortsteil: "Reinickendorf", von: "147", bis: "156", art: "F" }
  ],
  "Reuterstraße": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Ribbeweg": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Rickenweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Riemerstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Ringstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Ritterlandweg": [
    { plz: "13409", soko: "02", ortsteil: "Reinickendorf", von: "1", bis: "63", art: "U" },
    { plz: "13409", soko: "03", ortsteil: "Reinickendorf", von: "2", bis: "12", art: "G" }
  ],
  "Robinienweg": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Rodelbahnpfad": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Roedernallee": [
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "2", bis: "50", art: "F" },
    { plz: "13437", soko: "06", ortsteil: "Reinickendorf", von: "51", bis: "56", art: "F" },
    { plz: "13437", soko: "25", ortsteil: "Wittenau", von: "56A", bis: "118A", art: "F" },
    { plz: "13437", soko: "07", ortsteil: "Wittenau", von: "119", bis: "156", art: "F" },
    { plz: "13407", soko: "07", ortsteil: "Wittenau", von: "157", bis: "168", art: "F" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "171", bis: "183", art: "F" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "184", bis: "204", art: "F" }
  ],
  "Roedernau": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Roedernstr.": [
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "2", bis: "13", art: "F" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "14", bis: "58", art: "F" }
  ],
  "Rohrbrunner Str.": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Rohrweihstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Romanshorner Weg": [
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "15", bis: "202", art: "F" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "204", bis: "212", art: "G" }
  ],
  "Rorschacher Zeile": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Rosenorter Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Rosenplüterweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Rosentreterpromenade": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Roswithastr.": [{ plz: "13467", soko: "36", ortsteil: "Hermsdorf" }],
  "Rotbuchenweg": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Rotwildpfad": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Rue Ambroise Pare (Cité Pasteur)": [{ plz: "13405", soko: "09", ortsteil: "Tegel" }],
  "Rue Charles Calmette (Cité Pasteur)": [{ plz: "13405", soko: "09", ortsteil: "Tegel" }],
  "Rue Commandant Jean Toulasne": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue du Commandant Jean Tulasne": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rüdesheimer Str.": [
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "3", bis: "33", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "2", bis: "28", art: "G" },
    { plz: "13465", soko: "38", ortsteil: "Frohnau", von: "30", bis: "42", art: "G" }
  ],
  "Rue Diderot (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue Edith Piaf": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rüdnitzer Zeile": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Rue Dominique Larrey (Cité Pasteur)": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Rue Doret (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue du Capitaine Jean Maridor": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue du Dr. Roux (Cité Pasteur)": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Rue Georges Vallerey (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue Henri Guillaumet (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue Hyacinthe Vincent (Cité Pasteur)": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Rue Joseph le Brix (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue Lamartine (Cité Foch)": [{ plz: "13437", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue Marin la Meslee (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue Montesquieu (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue Nungesser et Coli (Cité Guynemer)": [{ plz: "13405", soko: "13", ortsteil: "Tegel" }],
  "Rue Racine (Cité Foch)": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue Simone de Beauvoir": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Rue René Laenec (Cité Pasteur)": [{ plz: "13469", soko: "09", ortsteil: "Reinickendorf" }],
  "Rütlistr.": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Rundhofer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Rundlingsteig": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Rundpfuhlweg": [{ plz: "13403", soko: "07", ortsteil: "Reinickendorf" }],
  "Ruppiner Chaussee": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "1", bis: "229", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "235", bis: "417", art: "U" },
    { plz: "13503", soko: "15", ortsteil: "Tegel", von: "22", bis: "120", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "206", bis: "408", art: "G" }
  ],
  "Saalmannsteig": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Saalmannstr.": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Sagemühler Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Sagritzer Weg": [{ plz: "13435", soko: "27", ortsteil: "Wittenau" }],
  "Sallgaster Str.": [{ plz: "13439", soko: "27", ortsteil: "Wittenau" }],
  "Sandgrasweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Sandhauser Str.": [
    { plz: "13505", soko: "16", ortsteil: "Konradshöhe", von: "1", bis: "59", art: "U" },
    { plz: "13505", soko: "16", ortsteil: "Konradshöhe", von: "2", bis: "62", art: "G" },
    { plz: "13505", soko: "17", ortsteil: "Heiligensee", von: "61", bis: "127", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "129", bis: "157", art: "U" },
    { plz: "13505", soko: "17", ortsteil: "Heiligensee", von: "64", bis: "130", art: "G" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "132", bis: "140", art: "G" }
  ],
  "Sangestr.": [{ plz: "13437", soko: "24", ortsteil: "Wittenau" }],
  "Sankt-Galler-Str.": [
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "1", bis: "19", art: "U" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "8", bis: "20", art: "G" }
  ],
  "Saatwinkler Damm": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Saturnstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Scharfenberg (Insel)": [{ plz: "13505", soko: "15", ortsteil: "Tegel" }],
  "Scharfenberger Str.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Scharnweberstr.": [
    { plz: "13405", soko: "08", ortsteil: "Reinickendorf", von: "1", bis: "16", art: "F" },
    { plz: "13405", soko: "09", ortsteil: "Reinickendorf", von: "17", bis: "44A", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "45", bis: "54", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "55", bis: "62", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "63", bis: "75", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "81", bis: "100", art: "F" },
    { plz: "13405", soko: "09", ortsteil: "Reinickendorf", von: "102", bis: "140", art: "F" }
  ],
  "Schauflerpfad": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Schellbronner Weg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Schickstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Schildower Str.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Schildower Weg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Schillerring": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "3", bis: "23", art: "F" },
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "29", bis: "34", art: "F" }
  ],
  "Schillingstr.": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Schlieperstr.": [
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "1", bis: "10", art: "F" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "11", bis: "70", art: "F" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "71", bis: "80", art: "F" }
  ],
  "Schlitzer Str.": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Schloßstr.": [
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf" },
    { plz: "13507", soko: "23", ortsteil: "Tegel" }
  ],
  "Schluchseestr.": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "3", bis: "13", art: "U" },
    { plz: "13469", soko: "25", ortsteil: "Waidmannslust", von: "4", bis: "82", art: "G" },
    { plz: "13469", soko: "25", ortsteil: "Waidmannslust", von: "39", bis: "63", art: "U" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "65", bis: "83", art: "U" },
    { plz: "13469", soko: "32", ortsteil: "Waidmannslust", von: "84", bis: "87", art: "F" }
  ],
  "Schlütersteg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Schmiedepfad": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Schmitzweg": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Schneegansweg": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "3", bis: "8", art: "F" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "9", bis: "18", art: "F" }
  ],
  "Schöllkrautstr.": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Schönbaumer Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Schönfließer Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Schollenhof": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Schollenweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Schonacher Str.": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Schorfheidestr.": [
    { plz: "13439", soko: "28", ortsteil: "Wittenau", von: "5", bis: "45", art: "U" },
    { plz: "13439", soko: "27", ortsteil: "Wittenau", von: "6", bis: "32", art: "G" }
  ],
  "Schramberger Str.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Schubartstr.": [
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "2", bis: "50", art: "F" },
    { plz: "13509", soko: "20", ortsteil: "Wittenau", von: "51", bis: "77", art: "U" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "52", bis: "82", art: "G" }
  ],
  "Schulenburgstr.": [
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "1", bis: "10", art: "F" },
    { plz: "13403", soko: "07", ortsteil: "Reinickendorf", von: "11", bis: "18", art: "F" }
  ],
  "Schulstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Schulzendorfer Str.": [
    { plz: "13467", soko: "34", ortsteil: "Hermsdorf", von: "1", bis: "107", art: "U" },
    { plz: "13467", soko: "35", ortsteil: "Hermsdorf", von: "2", bis: "144A", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "3", bis: "103", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "137", bis: "157", art: "U" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "2", bis: "2", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "10", bis: "114", art: "G" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "116", bis: "158", art: "G" }
  ],
  "Schwabstedter Weg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Schwabstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Schwartzstr.": [{ plz: "13409", soko: "02", ortsteil: "Reinickendorf" }],
  "Schwarzer Weg": [{ plz: "13505", soko: "15", ortsteil: "Tegel" }],
  "Schwarzkittelweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Schwarzspechtweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Seebadstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Seebeckstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Seeblickstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Seestr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Seidelstr.": [
    { plz: "13405", soko: "11", ortsteil: "Reinickendorf", von: "1", bis: "14", art: "F" },
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "15", bis: "48", art: "F" },
    { plz: "13505", soko: "13", ortsteil: "Tegel", von: "49", bis: "75", art: "F" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "76", bis: "80", art: "F" }
  ],
  "Selmer Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Semkensteig": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Semmelweg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Sendener Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Senftenberger Ring": [
    { plz: "13439", soko: "30", ortsteil: "Wittenau", von: "1", bis: "17", art: "F" },
    { plz: "13435", soko: "30", ortsteil: "Wittenau", von: "18", bis: "32", art: "G" },
    { plz: "13435", soko: "31", ortsteil: "Wittenau", von: "23", bis: "99", art: "U" },
    { plz: "13435", soko: "29", ortsteil: "Wittenau", von: "34", bis: "38D", art: "G" },
    { plz: "13435", soko: "32", ortsteil: "Wittenau", von: "40", bis: "40H", art: "G" },
    { plz: "13435", soko: "31", ortsteil: "Wittenau", von: "42", bis: "92", art: "G" },
    { plz: "13435", soko: "30", ortsteil: "Wittenau", von: "94", bis: "100", art: "G" }
  ],
  "Senheimer Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Senziger Zeile": [{ plz: "13435", soko: "27", ortsteil: "Wittenau" }],
  "Seppenrader Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Septimerstr.": [{ plz: "13407", soko: "08", ortsteil: "Reinickendorf" }],
  "Siedelmeisterweg": [{ plz: "13403", soko: "11", ortsteil: "Reinickendorf" }],
  "Siedlung am Fließ": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Sigismundkorso": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Silberhammerweg": [
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "1", bis: "39", art: "F" },
    { plz: "13503", soko: "19", ortsteil: "Heiligensee", von: "40", bis: "114", art: "F" }
  ],
  "Silvesterweg": [
    { plz: "13467", soko: "33", ortsteil: "Hermsdorf", von: "1", bis: "29", art: "F" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "31", bis: "73A", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Hermsdorf", von: "75", bis: "79", art: "U" },
    { plz: "13467", soko: "36", ortsteil: "Hermsdorf", von: "32", bis: "72", art: "G" },
    { plz: "13465", soko: "36", ortsteil: "Hermsdorf", von: "74", bis: "74", art: "G" }
  ],
  "Simmelstr.": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Singdrosselsteig": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Sittestr.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Söllerpfad": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Solferinostr.": [{ plz: "13403", soko: "08", ortsteil: "Reinickendorf" }],
  "Solquellstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Soltauer Str.": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Sommerfelder Str.": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Sommerstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Sonnenwalder Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Spachtelweg": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Spechtstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Speerweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Sperberstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Spießergasse": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Spießweg": [
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "1", bis: "23", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "29", bis: "53", art: "U" },
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "26", bis: "182", art: "G" }
  ],
  "Sprintsteig": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Staehleweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Staffelder Weg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Stargardtstr.": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Stegeweg": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Steilpfad": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Steinadlerpfad": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Steinkauzgasse": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Steinkirchener Str.": [{ plz: "13435", soko: "27", ortsteil: "Wittenau" }],
  "Sterkrader Str.": [
    { plz: "13507", soko: "13", ortsteil: "Tegel", von: "1", bis: "39", art: "F" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "43", bis: "47", art: "U" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "49", bis: "59", art: "U" },
    { plz: "13507", soko: "14", ortsteil: "Tegel", von: "40", bis: "56", art: "G" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "60", bis: "62", art: "G" }
  ],
  "Stillachzeile": [{ plz: "13509", soko: "20", ortsteil: "Tegel" }],
  "Stockumer Str.": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Stößerstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Stolpmünder Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Stolzingstr.": [
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "1", bis: "22", art: "F" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "24", bis: "68", art: "F" }
  ],
  "Straße A": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße A, C - H, J - Q (HOKA III)": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße B": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße C": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße D": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße E": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße F": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße G": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße H": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße I": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße J": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße K": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße L": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße M": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße N": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße O": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße P": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße Q": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße R": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße R bis Z (HOKA IV)": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße S": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße T": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße U": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße V": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße W": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße X": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße Y": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße Z": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Straße 12": [{ plz: "13509", soko: "21", ortsteil: "Tegel" }],
  "Straße 19 A": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Straße 22": [{ plz: "13509", soko: "13", ortsteil: "Tegel" }],
  "Straße 52": [
    { plz: "13465", soko: "38", ortsteil: "Frohnau" },
    { plz: "13509", soko: "34", ortsteil: "Tegel" }
  ],
  "Straße 53": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Straße 54": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Straße 114 A": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Straße 166": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Straße 167": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Straße 184": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Straße 199": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Straße 366": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Straße 367": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Straße 368": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Straße 442": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Straße 462": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Straupitzer Steig": [{ plz: "13439", soko: "30", ortsteil: "Wittenau" }],
  "Stubbichtweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Süderholmer Steig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Taldorfer Weg": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Talsandweg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Tannenhäherstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Tannenstr.": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Techowpromenade": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Tegeler Str.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Tegelorter Ufer": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Tegernauer Zeile": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Teichstr.": [
    { plz: "13407", soko: "05", ortsteil: "Reinickendorf", von: "1", bis: "65", art: "F" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "67", bis: "69F", art: "F" }
  ],
  "Teschendorfer Weg": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Tessenowstr.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Thaterstr.": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Theresenweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Thiloweg": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Thurbrucher Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Thurgauer Str.": [
    { plz: "13407", soko: "04", ortsteil: "Reinickendorf", von: "9", bis: "56", art: "F" },
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "58", bis: "66", art: "G" }
  ],
  "Thyssenstr.": [
    { plz: "13407", soko: "06", ortsteil: "Reinickendorf", von: "1", bis: "27", art: "U" },
    { plz: "13407", soko: "07", ortsteil: "Wittenau", von: "4", bis: "28", art: "G" }
  ],
  "Tiefenbronner Weg": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Tiefenseer Str.": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Tietzstr.": [{ plz: "13509", soko: "21", ortsteil: "Wittenau" }],
  "Tile-Brügge-Weg": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Titiseestr.": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "1", bis: "12", art: "F" },
    { plz: "13469", soko: "25", ortsteil: "Waidmannslust", von: "17", bis: "49", art: "U" }
  ],
  "Titusweg": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Todtnauer Zeile": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Tonstichweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Tornower Weg": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Trampenauer Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Tramper Weg": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Treiberpfad": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Trepliner Weg": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Treskowstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Trettachzeile": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Treuenbrietzener Str.": [{ plz: "13439", soko: "29", ortsteil: "Wittenau" }],
  "Treutelstr.": [{ plz: "13437", soko: "22", ortsteil: "Wittenau" }],
  "Triftstr.": [
    { plz: "13437", soko: "24", ortsteil: "Wittenau", von: "1", bis: "23", art: "F" },
    { plz: "13509", soko: "21", ortsteil: "Wittenau", von: "36", bis: "38", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "61", bis: "84", art: "F" },
    { plz: "13437", soko: "22", ortsteil: "Wittenau", von: "85", bis: "999", art: "F" }
  ],
  "Triniusstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Turmfalkenstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Uferweg Neheimer Str.": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Ulmenstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Ulrichsteiner Weg": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Unkeler Pfad": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Uranusweg": [
    { plz: "13405", soko: "09", ortsteil: "Reinickendorf", von: "1", bis: "33", art: "U" },
    { plz: "13405", soko: "10", ortsteil: "Reinickendorf", von: "34", bis: "34", art: "G" }
  ],
  "Utestr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Valentinswerder (Insel)": [{ plz: "13599", soko: "12", ortsteil: "Tegel" }],
  "Veitstr.": [
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "1", bis: "4B", art: "F" },
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "5", bis: "40A", art: "F" },
    { plz: "13507", soko: "20", ortsteil: "Tegel", von: "41", bis: "47", art: "F" }
  ],
  "Veltener Str.": [{ plz: "13407", soko: "07", ortsteil: "Reinickendorf" }],
  "Veltheimstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Venusstr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Verlängerte Fährstr.": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Verlängerte Koloniestr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Vierwaldstätter Weg": [{ plz: "13407", soko: "04", ortsteil: "Reinickendorf" }],
  "Vietzer Zeile": [{ plz: "13509", soko: "20", ortsteil: "Wittenau" }],
  "Virgiliusstr.": [{ plz: "13509", soko: "34", ortsteil: "Tegel" }],
  "Von-der-Gablentz-Str.": [{ plz: "13403", soko: "09", ortsteil: "Reinickendorf" }],
  "Vor den Toren": [{ plz: "13629", soko: "12", ortsteil: "Tegel" }],
  "Wachsmuthstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Wachstr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Wahnfriedstr.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Waidmannsluster Damm": [
    { plz: "13507", soko: "15", ortsteil: "Tegel", von: "1", bis: "7F", art: "U" },
    { plz: "13507", soko: "23", ortsteil: "Tegel", von: "10", bis: "10", art: "G" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "12", bis: "80", art: "G" },
    { plz: "13509", soko: "34", ortsteil: "Tegel", von: "13", bis: "35A", art: "U" },
    { plz: "13509", soko: "34", ortsteil: "Tegel", von: "37", bis: "79", art: "U" },
    { plz: "13469", soko: "24", ortsteil: "Waidmannslust", von: "81", bis: "180", art: "F" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "179", bis: "194", art: "F" }
  ],
  "Walderseestr.": [{ plz: "13407", soko: "03", ortsteil: "Reinickendorf" }],
  "Waldfriedenstr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Waldhornstr.": [{ plz: "13469", soko: "24", ortsteil: "Waidmannslust" }],
  "Waldkauzstr.": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Waldläuferweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Waldowstr.": [
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "1", bis: "21", art: "F" },
    { plz: "13403", soko: "07", ortsteil: "Reinickendorf", von: "22", bis: "32", art: "F" },
    { plz: "13407", soko: "07", ortsteil: "Reinickendorf", von: "34", bis: "37", art: "F" },
    { plz: "13403", soko: "07", ortsteil: "Reinickendorf", von: "38", bis: "43", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "44", bis: "65", art: "F" }
  ],
  "Waldseeweg": [{ plz: "13469", soko: "33", ortsteil: "Hermsdorf" }],
  "Waldshuter Zeile": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Waldspechtweg": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Waldstr.": [
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "1", bis: "73A", art: "F" },
    { plz: "13403", soko: "08", ortsteil: "Reinickendorf", von: "74", bis: "107", art: "F" }
  ],
  "Wallenroder Str.": [{ plz: "13435", soko: "25", ortsteil: "Wittenau" }],
  "Walliser Str.": [{ plz: "13407", soko: "06", ortsteil: "Reinickendorf" }],
  "Walporzheimer Str.": [{ plz: "13465", soko: "36", ortsteil: "Frohnau" }],
  "Warnauer Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Weidenauer Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Weinbrennerweg": [{ plz: "13407", soko: "07", ortsteil: "Wittenau" }],
  "Weislingenstr.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Welfenallee": [
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "1", bis: "79", art: "U" },
    { plz: "13465", soko: "36", ortsteil: "Frohnau", von: "2", bis: "62", art: "G" },
    { plz: "13465", soko: "37", ortsteil: "Frohnau", von: "72", bis: "76", art: "G" }
  ],
  "Welzower Steig": [{ plz: "13439", soko: "27", ortsteil: "Wittenau" }],
  "Wentowsteig": [{ plz: "13439", soko: "28", ortsteil: "Wittenau" }],
  "Werdohler Weg": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Werftendensteig": [{ plz: "13409", soko: "03", ortsteil: "Reinickendorf" }],
  "Wernickestr.": [{ plz: "13467", soko: "34", ortsteil: "Hermsdorf" }],
  "Wesendorfer Str.": [{ plz: "13439", soko: "29", ortsteil: "Wittenau" }],
  "Wesselburer Weg": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Westiger Pfad": [{ plz: "13507", soko: "13", ortsteil: "Tegel" }],
  "Weststr.": [{ plz: "13405", soko: "09", ortsteil: "Reinickendorf" }],
  "Wickeder Str.": [{ plz: "13507", soko: "14", ortsteil: "Tegel" }],
  "Wickhofstr.": [{ plz: "13467", soko: "33", ortsteil: "Hermsdorf" }],
  "Wildganssteig": [
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "1", bis: "25", art: "U" },
    { plz: "13503", soko: "17", ortsteil: "Heiligensee", von: "2", bis: "108", art: "G" },
    { plz: "13503", soko: "18", ortsteil: "Heiligensee", von: "29", bis: "109", art: "U" }
  ],
  "Wildkanzelweg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Wildschwansteig": [{ plz: "13503", soko: "17", ortsteil: "Heiligensee" }],
  "Wildtaubenweg": [{ plz: "13505", soko: "16", ortsteil: "Konradshöhe" }],
  "Wilhelm-Blume-Allee": [{ plz: "13509", soko: "23", ortsteil: "Tegel" }],
  "Wilhelm-Gericke-Str.": [{ plz: "13437", soko: "07", ortsteil: "Wittenau" }],
  "Wilhelmsruher Damm": [
    { plz: "13439", soko: "28", ortsteil: "Wittenau", von: "61", bis: "101", art: "U" },
    { plz: "13439", soko: "30", ortsteil: "Wittenau", von: "103", bis: "185", art: "U" },
    { plz: "13435", soko: "27", ortsteil: "Wittenau", von: "187", bis: "225", art: "U" },
    { plz: "13435", soko: "25", ortsteil: "Wittenau", von: "229", bis: "245", art: "U" },
    { plz: "13439", soko: "29", ortsteil: "Wittenau", von: "26", bis: "126", art: "G" },
    { plz: "13439", soko: "30", ortsteil: "Wittenau", von: "128", bis: "158", art: "G" },
    { plz: "13435", soko: "30", ortsteil: "Wittenau", von: "160", bis: "160", art: "G" },
    { plz: "13435", soko: "27", ortsteil: "Wittenau", von: "162", bis: "228", art: "G" },
    { plz: "13435", soko: "25", ortsteil: "Wittenau", von: "230", bis: "246", art: "G" }
  ],
  "Wilhelmstr.": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Wilkestr.": [{ plz: "13507", soko: "15", ortsteil: "Tegel" }],
  "Wilsbergzeile": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }],
  "Wiltinger Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Windhalmweg": [{ plz: "13403", soko: "21", ortsteil: "Wittenau" }],
  "Windmühlenweg": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Winterstr.": [{ plz: "13409", soko: "01", ortsteil: "Reinickendorf" }],
  "Winterthurstr.": [{ plz: "13407", soko: "08", ortsteil: "Reinickendorf" }],
  "Wisentweg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Wittenauer Str.": [
    { plz: "13435", soko: "25", ortsteil: "Wittenau", von: "1", bis: "123", art: "F" },
    { plz: "13469", soko: "32", ortsteil: "Lübars", von: "127", bis: "265", art: "F" }
  ],
  "Wittestr.": [
    { plz: "13509", soko: "11", ortsteil: "Reinickendorf", von: "2", bis: "15A", art: "F" },
    { plz: "13509", soko: "13", ortsteil: "Reinickendorf", von: "16", bis: "50", art: "F" },
    { plz: "13509", soko: "11", ortsteil: "Reinickendorf", von: "51", bis: "78", art: "F" }
  ],
  "Wolfacher Pfad": [{ plz: "13469", soko: "26", ortsteil: "Waidmannslust" }],
  "Zabel-Krüger-Damm": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "1", bis: "12B", art: "F" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "13", bis: "69", art: "U" },
    { plz: "13469", soko: "25", ortsteil: "Waidmannslust", von: "14", bis: "20", art: "G" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "22", bis: "74", art: "G" },
    { plz: "13469", soko: "32", ortsteil: "Lübars", von: "71", bis: "237", art: "U" },
    { plz: "13469", soko: "32", ortsteil: "Lübars", von: "76", bis: "236", art: "G" }
  ],
  "Zangengasse": [{ plz: "13437", soko: "25", ortsteil: "Wittenau" }],
  "Zanower Weg": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Zehntwerderweg": [
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "2", bis: "100", art: "G" },
    { plz: "13469", soko: "26", ortsteil: "Waidmannslust", von: "3", bis: "97", art: "U" },
    { plz: "13469", soko: "32", ortsteil: "Lübars", von: "99", bis: "217", art: "U" },
    { plz: "13469", soko: "32", ortsteil: "Lübars", von: "102", bis: "212", art: "G" }
  ],
  "Zeisgendorfer Weg": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Zeltinger Platz": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Zeltinger Str.": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Zempiner Steig": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Zermatter Str.": [{ plz: "13407", soko: "05", ortsteil: "Reinickendorf" }],
  "Zerndorfer Weg": [{ plz: "13465", soko: "38", ortsteil: "Frohnau" }],
  "Zerpenschleuser Ring": [{ plz: "13439", soko: "29", ortsteil: "Wittenau" }],
  "Ziegeleiweg": [{ plz: "13469", soko: "32", ortsteil: "Wittenau" }],
  "Ziegenorter Pfad": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Ziekowstr.": [
    { plz: "13509", soko: "20", ortsteil: "Tegel", von: "79", bis: "124", art: "F" },
    { plz: "13509", soko: "23", ortsteil: "Tegel", von: "126", bis: "164", art: "F" }
  ],
  "Zieselweg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Zobeltitzstr.": [
    { plz: "13403", soko: "09", ortsteil: "Reinickendorf", von: "2", bis: "43", art: "F" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "44", bis: "94", art: "G" },
    { plz: "13403", soko: "10", ortsteil: "Reinickendorf", von: "45", bis: "89B", art: "U" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "93", bis: "117", art: "U" },
    { plz: "13403", soko: "11", ortsteil: "Reinickendorf", von: "96", bis: "118A", art: "G" }
  ],
  "Zühler Weg": [{ plz: "13467", soko: "35", ortsteil: "Hermsdorf" }],
  "Zugdamer Steig": [{ plz: "13503", soko: "18", ortsteil: "Heiligensee" }],
  "Zum Klötzbecken": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Zum Klötzhain": [{ plz: "13469", soko: "32", ortsteil: "Lübars" }],
  "Zur Sonnenhöhe": [{ plz: "13503", soko: "19", ortsteil: "Heiligensee" }],
  "Zwergenweg": [{ plz: "13465", soko: "37", ortsteil: "Frohnau" }]
});
const normalisiereStrasse = s => s.trim().toLowerCase()
  .replace(/\s*\([^)]*\)/g, '')
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .replace(/[éèêë]/g, 'e').replace(/[àâ]/g, 'a').replace(/[îï]/g, 'i')
  .replace(/[ôœ]/g, 'o').replace(/[ûù]/g, 'u').replace(/ç/g, 'c')
  .replace(/-/g, ' ')
  .replace(/strasse\b/g, 'str')
  .replace(/str\./g, 'str')
  .replace(/\s+/g, ' ').trim();
const strassenIndex = new Map(
  Object.keys(SOKO_STRASSENVERZEICHNIS).map(s => [normalisiereStrasse(s), s])
);
const zerlegeHausnummer = hn => {
  const clean = String(hn).trim();
  const exact = clean.match(/^(\d+)([A-Za-z]*)$/);
  if (exact) return { zahl: parseInt(exact[1], 10), buchstabe: (exact[2] || '').toUpperCase() };
  // Bereiche (5-7, 14/16) und Listen (1,3 / 35;37): führende Zahl nehmen
  const leading = clean.match(/^(\d+)/);
  return leading ? { zahl: parseInt(leading[1], 10), buchstabe: '' } : null;
};
const regelPasst = (regel, nummer) => {
  if (!regel.von) return true; // kein Bereich = alle Hausnummern
  if (!nummer) return false;
  const von = parseInt(regel.von, 10);
  const bis = parseInt(regel.bis, 10);
  const n = nummer.zahl;
  if (n < von || n > bis) return false;
  if (regel.art === 'G' && n % 2 !== 0) return false;
  if (regel.art === 'U' && n % 2 === 0) return false;
  return true;
};
const findeSoko = (strasse, hausnummer, plz = null) => {
  const originalStrasse = strassenIndex.get(normalisiereStrasse(strasse));
  if (!originalStrasse) {
    throw new Error(`Straße nicht gefunden: ${strasse}`);
  }

  const nummer = zerlegeHausnummer(hausnummer);
  const plzText = plz == null ? null : String(plz).trim();
  const passendeRegeln = SOKO_STRASSENVERZEICHNIS[originalStrasse]
    .filter((regel) => regelPasst(regel, nummer));
  const trefferMitPlz = passendeRegeln.filter((regel) => plzText === null || regel.plz === plzText);
  const treffer = trefferMitPlz.length ? trefferMitPlz : passendeRegeln;

  const eindeutig = [...new Map(treffer.map((regel) => [`${regel.soko}|${regel.plz}|${regel.ortsteil}`, regel,])).values()];

  if (eindeutig.length === 0) {
    throw new Error(`Keine SOKO-Zuordnung für ${originalStrasse} ${hausnummer}${plzText ? `, ${plzText}` : ""} gefunden.`);
  }
  if (eindeutig.length > 1) {
    eindeutig.sort((a, b) => Number(a.soko) - Number(b.soko));
  }

  const regel = eindeutig[0];
  return {
    soko: regel.soko,
    plz: regel.plz,
    ortsteil: regel.ortsteil,
    strasse: originalStrasse,
  };
};

// Beispiele:
// findeSoko("Alemannenstr.", "12");       // { soko: "37", ... }
// findeSoko("Berliner Str.", "10", 13507); // { soko: "15", ... }

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SOKO_STRASSENVERZEICHNIS, findeSoko };
}
if (typeof window !== "undefined") {
  window.SOKO_STRASSENVERZEICHNIS = SOKO_STRASSENVERZEICHNIS;
  window.findeSoko = findeSoko;
}
