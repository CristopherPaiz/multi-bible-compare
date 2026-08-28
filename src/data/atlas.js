/**
 * Atlas bíblico: lugares y cronología.
 *
 * ---------------------------------------------------------------------------
 * Sobre las fechas
 * ---------------------------------------------------------------------------
 * Casi ninguna fecha del Antiguo Testamento es un dato cerrado. El Éxodo tiene
 * dos dataciones que se defienden en serio (siglo XV frente a siglo XIII), y
 * las de los patriarcas dependen de cuál se elija. Aquí se usa la cronología
 * convencional larga y CADA entrada lleva `aproximada: true` cuando lo es, para
 * que la UI lo diga con un "c." delante en vez de presentar como hecho lo que
 * es una reconstrucción.
 *
 * Esto no zanja el debate ni pretende hacerlo: sirve para situar un pasaje en
 * el tiempo respecto a otro, que es lo que ayuda al leer.
 *
 * ---------------------------------------------------------------------------
 * Sobre las coordenadas
 * ---------------------------------------------------------------------------
 * Son coordenadas reales (grados decimales) de la identificación arqueológica
 * más aceptada. Unas pocas —Sodoma, el monte Sinaí, Emaús— no tienen
 * identificación segura y llevan `incierto: true`: se pinta el marcador, pero
 * la UI avisa de que la ubicación se discute.
 *
 * El mapa que las dibuja es esquemático a propósito. Un mapa de verdad
 * necesitaría teselas de un servidor externo, y esta app funciona instalada y
 * sin conexión.
 */

/** Tipos de lugar. Determinan el icono y el color del marcador. */
export const TIPOS_LUGAR = ["ciudad", "monte", "agua", "region"];

/**
 * @typedef {object} Lugar
 * @property {string} id
 * @property {string} es  nombre en español
 * @property {string} en  nombre en inglés
 * @property {number} lat
 * @property {number} lon
 * @property {string} tipo
 * @property {string[]} epocas  "patriarcas" | "exodo" | "reyes" | "exilio" | "jesus" | "iglesia"
 * @property {boolean} [incierto]
 */
export const LUGARES = [
  // --- Judea y Jerusalén ---
  { id: "jerusalen", es: "Jerusalén", en: "Jerusalem", lat: 31.7683, lon: 35.2137, tipo: "ciudad", epocas: ["patriarcas", "reyes", "exilio", "jesus", "iglesia"] },
  { id: "belen", es: "Belén", en: "Bethlehem", lat: 31.7054, lon: 35.2024, tipo: "ciudad", epocas: ["reyes", "jesus"] },
  { id: "hebron", es: "Hebrón", en: "Hebron", lat: 31.5326, lon: 35.0998, tipo: "ciudad", epocas: ["patriarcas", "reyes"] },
  { id: "betania", es: "Betania", en: "Bethany", lat: 31.7714, lon: 35.2622, tipo: "ciudad", epocas: ["jesus"] },
  { id: "emaus", es: "Emaús", en: "Emmaus", lat: 31.839, lon: 34.989, tipo: "ciudad", epocas: ["jesus"], incierto: true },
  { id: "jerico", es: "Jericó", en: "Jericho", lat: 31.87, lon: 35.444, tipo: "ciudad", epocas: ["exodo", "reyes", "jesus"] },
  { id: "belsemes", es: "Bet-semes", en: "Beth Shemesh", lat: 31.7519, lon: 34.9861, tipo: "ciudad", epocas: ["reyes"] },
  { id: "laquis", es: "Laquis", en: "Lachish", lat: 31.565, lon: 34.849, tipo: "ciudad", epocas: ["reyes"] },
  { id: "mizpa", es: "Mizpa", en: "Mizpah", lat: 31.883, lon: 35.216, tipo: "ciudad", epocas: ["reyes"] },
  { id: "rama", es: "Ramá", en: "Ramah", lat: 31.8964, lon: 35.2117, tipo: "ciudad", epocas: ["reyes"] },
  { id: "gabaa", es: "Gabaa", en: "Gibeah", lat: 31.8236, lon: 35.2306, tipo: "ciudad", epocas: ["reyes"] },
  { id: "beerseba", es: "Beerseba", en: "Beersheba", lat: 31.2518, lon: 34.7913, tipo: "ciudad", epocas: ["patriarcas", "reyes"] },

  // --- Samaria y Galilea ---
  { id: "samaria", es: "Samaria", en: "Samaria", lat: 32.2806, lon: 35.1969, tipo: "ciudad", epocas: ["reyes"] },
  { id: "siquem", es: "Siquem", en: "Shechem", lat: 32.2136, lon: 35.2792, tipo: "ciudad", epocas: ["patriarcas", "exodo", "reyes"] },
  { id: "sicar", es: "Sicar", en: "Sychar", lat: 32.21, lon: 35.28, tipo: "ciudad", epocas: ["jesus"] },
  { id: "betel", es: "Betel", en: "Bethel", lat: 31.9308, lon: 35.2203, tipo: "ciudad", epocas: ["patriarcas", "reyes"] },
  { id: "silo", es: "Silo", en: "Shiloh", lat: 32.0556, lon: 35.2894, tipo: "ciudad", epocas: ["exodo", "reyes"] },
  { id: "nazaret", es: "Nazaret", en: "Nazareth", lat: 32.7016, lon: 35.2973, tipo: "ciudad", epocas: ["jesus"] },
  { id: "cana", es: "Caná", en: "Cana", lat: 32.75, lon: 35.34, tipo: "ciudad", epocas: ["jesus"] },
  { id: "capernaum", es: "Capernaúm", en: "Capernaum", lat: 32.8808, lon: 35.575, tipo: "ciudad", epocas: ["jesus"] },
  { id: "betsaida", es: "Betsaida", en: "Bethsaida", lat: 32.91, lon: 35.63, tipo: "ciudad", epocas: ["jesus"] },
  { id: "tiberias", es: "Tiberias", en: "Tiberias", lat: 32.7959, lon: 35.5312, tipo: "ciudad", epocas: ["jesus"] },
  { id: "meguido", es: "Meguido", en: "Megiddo", lat: 32.5847, lon: 35.1836, tipo: "ciudad", epocas: ["reyes"] },
  { id: "jezreel", es: "Jezreel", en: "Jezreel", lat: 32.5561, lon: 35.3319, tipo: "ciudad", epocas: ["reyes"] },
  { id: "endor", es: "Endor", en: "Endor", lat: 32.63, lon: 35.4, tipo: "ciudad", epocas: ["reyes"] },
  { id: "dan", es: "Dan", en: "Dan", lat: 33.2486, lon: 35.6522, tipo: "ciudad", epocas: ["reyes"] },
  { id: "cesarea", es: "Cesarea", en: "Caesarea", lat: 32.5, lon: 34.8917, tipo: "ciudad", epocas: ["jesus", "iglesia"] },
  { id: "cesareafilipo", es: "Cesarea de Filipo", en: "Caesarea Philippi", lat: 33.2486, lon: 35.6944, tipo: "ciudad", epocas: ["jesus"] },
  { id: "jope", es: "Jope", en: "Joppa", lat: 32.0553, lon: 34.7522, tipo: "ciudad", epocas: ["reyes", "iglesia"] },

  // --- Filistea y costa ---
  { id: "gaza", es: "Gaza", en: "Gaza", lat: 31.5017, lon: 34.4668, tipo: "ciudad", epocas: ["reyes"] },
  { id: "asdod", es: "Asdod", en: "Ashdod", lat: 31.8014, lon: 34.6435, tipo: "ciudad", epocas: ["reyes"] },
  { id: "ascalon", es: "Ascalón", en: "Ashkelon", lat: 31.6658, lon: 34.5664, tipo: "ciudad", epocas: ["reyes"] },
  { id: "ecron", es: "Ecrón", en: "Ekron", lat: 31.78, lon: 34.85, tipo: "ciudad", epocas: ["reyes"] },
  { id: "gat", es: "Gat", en: "Gath", lat: 31.6989, lon: 34.8478, tipo: "ciudad", epocas: ["reyes"] },
  { id: "tiro", es: "Tiro", en: "Tyre", lat: 33.2704, lon: 35.2038, tipo: "ciudad", epocas: ["reyes", "jesus"] },
  { id: "sidon", es: "Sidón", en: "Sidon", lat: 33.5571, lon: 35.3729, tipo: "ciudad", epocas: ["reyes", "jesus", "iglesia"] },

  // --- Transjordania y Siria ---
  { id: "damasco", es: "Damasco", en: "Damascus", lat: 33.5138, lon: 36.2765, tipo: "ciudad", epocas: ["patriarcas", "reyes", "iglesia"] },
  { id: "gerasa", es: "Gerasa", en: "Gerasa", lat: 32.2808, lon: 35.8917, tipo: "ciudad", epocas: ["jesus"] },
  { id: "sela", es: "Sela (Petra)", en: "Sela (Petra)", lat: 30.3285, lon: 35.4444, tipo: "ciudad", epocas: ["reyes"] },

  // --- Montes ---
  { id: "sinai", es: "Monte Sinaí", en: "Mount Sinai", lat: 28.5392, lon: 33.975, tipo: "monte", epocas: ["exodo"], incierto: true },
  { id: "nebo", es: "Monte Nebo", en: "Mount Nebo", lat: 31.7683, lon: 35.7256, tipo: "monte", epocas: ["exodo"] },
  { id: "carmelo", es: "Monte Carmelo", en: "Mount Carmel", lat: 32.73, lon: 35.04, tipo: "monte", epocas: ["reyes"] },
  { id: "hermon", es: "Monte Hermón", en: "Mount Hermon", lat: 33.4162, lon: 35.857, tipo: "monte", epocas: ["jesus"] },
  { id: "tabor", es: "Monte Tabor", en: "Mount Tabor", lat: 32.6867, lon: 35.3906, tipo: "monte", epocas: ["reyes", "jesus"] },
  { id: "ararat", es: "Montes de Ararat", en: "Mountains of Ararat", lat: 39.7019, lon: 44.2983, tipo: "monte", epocas: ["patriarcas"], incierto: true },

  // --- Aguas ---
  { id: "galilea", es: "Mar de Galilea", en: "Sea of Galilee", lat: 32.8, lon: 35.59, tipo: "agua", epocas: ["jesus"] },
  { id: "muerto", es: "Mar Muerto", en: "Dead Sea", lat: 31.5, lon: 35.47, tipo: "agua", epocas: ["patriarcas", "reyes"] },
  { id: "jordan", es: "Río Jordán", en: "Jordan River", lat: 32.31, lon: 35.56, tipo: "agua", epocas: ["exodo", "reyes", "jesus"] },
  { id: "eufrates", es: "Río Éufrates", en: "Euphrates River", lat: 33.5, lon: 43.5, tipo: "agua", epocas: ["patriarcas", "exilio"] },
  { id: "nilo", es: "Río Nilo", en: "Nile River", lat: 27.5, lon: 31.0, tipo: "agua", epocas: ["patriarcas", "exodo"] },

  // --- Egipto y desierto ---
  { id: "menfis", es: "Menfis", en: "Memphis", lat: 29.85, lon: 31.25, tipo: "ciudad", epocas: ["patriarcas", "exodo"] },
  { id: "gosen", es: "Gosén", en: "Goshen", lat: 30.8, lon: 31.8, tipo: "region", epocas: ["patriarcas", "exodo"] },
  { id: "alejandria", es: "Alejandría", en: "Alexandria", lat: 31.2001, lon: 29.9187, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "cades", es: "Cades-barnea", en: "Kadesh Barnea", lat: 30.68, lon: 34.42, tipo: "ciudad", epocas: ["exodo"] },
  { id: "eziongeber", es: "Ezión-geber", en: "Ezion Geber", lat: 29.55, lon: 35.0, tipo: "ciudad", epocas: ["exodo", "reyes"] },

  // --- Mesopotamia y Persia ---
  { id: "babilonia", es: "Babilonia", en: "Babylon", lat: 32.5364, lon: 44.4208, tipo: "ciudad", epocas: ["patriarcas", "exilio"] },
  { id: "ur", es: "Ur", en: "Ur", lat: 30.9626, lon: 46.103, tipo: "ciudad", epocas: ["patriarcas"] },
  { id: "harán", es: "Harán", en: "Haran", lat: 36.865, lon: 39.03, tipo: "ciudad", epocas: ["patriarcas"] },
  { id: "ninive", es: "Nínive", en: "Nineveh", lat: 36.3597, lon: 43.1528, tipo: "ciudad", epocas: ["reyes", "exilio"] },
  { id: "carquemis", es: "Carquemis", en: "Carchemish", lat: 36.83, lon: 38.02, tipo: "ciudad", epocas: ["exilio"] },
  { id: "susa", es: "Susa", en: "Susa", lat: 32.19, lon: 48.25, tipo: "ciudad", epocas: ["exilio"] },
  { id: "persepolis", es: "Persépolis", en: "Persepolis", lat: 29.9356, lon: 52.8916, tipo: "ciudad", epocas: ["exilio"] },

  // --- Asia Menor ---
  { id: "antioquia", es: "Antioquía de Siria", en: "Antioch in Syria", lat: 36.2021, lon: 36.1603, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "tarso", es: "Tarso", en: "Tarsus", lat: 36.9177, lon: 34.8951, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "efeso", es: "Éfeso", en: "Ephesus", lat: 37.9494, lon: 27.3639, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "esmirna", es: "Esmirna", en: "Smyrna", lat: 38.4237, lon: 27.1428, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "pergamo", es: "Pérgamo", en: "Pergamum", lat: 39.1206, lon: 27.1817, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "tiatira", es: "Tiatira", en: "Thyatira", lat: 38.9186, lon: 27.8342, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "sardis", es: "Sardis", en: "Sardis", lat: 38.4886, lon: 28.04, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "filadelfia", es: "Filadelfia", en: "Philadelphia", lat: 38.35, lon: 28.5167, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "laodicea", es: "Laodicea", en: "Laodicea", lat: 37.8361, lon: 29.1078, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "colosas", es: "Colosas", en: "Colossae", lat: 37.79, lon: 29.26, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "mileto", es: "Mileto", en: "Miletus", lat: 37.53, lon: 27.28, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "troas", es: "Troas", en: "Troas", lat: 39.75, lon: 26.16, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "iconio", es: "Iconio", en: "Iconium", lat: 37.8746, lon: 32.4932, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "listra", es: "Listra", en: "Lystra", lat: 37.58, lon: 32.45, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "derbe", es: "Derbe", en: "Derbe", lat: 37.35, lon: 33.27, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "perge", es: "Perge", en: "Perga", lat: 36.9611, lon: 30.8536, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "atalia", es: "Atalia", en: "Attalia", lat: 36.8969, lon: 30.7133, tipo: "ciudad", epocas: ["iglesia"] },

  // --- Grecia, islas e Italia ---
  { id: "filipos", es: "Filipos", en: "Philippi", lat: 41.0136, lon: 24.2864, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "tesalonica", es: "Tesalónica", en: "Thessalonica", lat: 40.6401, lon: 22.9444, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "berea", es: "Berea", en: "Berea", lat: 40.5236, lon: 22.2028, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "atenas", es: "Atenas", en: "Athens", lat: 37.9838, lon: 23.7275, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "corinto", es: "Corinto", en: "Corinth", lat: 37.9061, lon: 22.8792, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "cencrea", es: "Cencrea", en: "Cenchreae", lat: 37.8869, lon: 22.9906, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "nicopolis", es: "Nicópolis", en: "Nicopolis", lat: 38.97, lon: 20.73, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "patmos", es: "Patmos", en: "Patmos", lat: 37.3089, lon: 26.5471, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "creta", es: "Creta", en: "Crete", lat: 34.9333, lon: 24.8, tipo: "region", epocas: ["iglesia"] },
  { id: "chipre", es: "Chipre (Salamina)", en: "Cyprus (Salamis)", lat: 35.18, lon: 33.9, tipo: "region", epocas: ["iglesia"] },
  { id: "pafos", es: "Pafos", en: "Paphos", lat: 34.7754, lon: 32.4245, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "malta", es: "Malta", en: "Malta", lat: 35.9375, lon: 14.3754, tipo: "region", epocas: ["iglesia"] },
  { id: "puteoli", es: "Puteoli", en: "Puteoli", lat: 40.8236, lon: 14.1222, tipo: "ciudad", epocas: ["iglesia"] },
  { id: "roma", es: "Roma", en: "Rome", lat: 41.9028, lon: 12.4964, tipo: "ciudad", epocas: ["iglesia"] },

  // --- Ubicación discutida ---
  { id: "sodoma", es: "Sodoma", en: "Sodom", lat: 31.15, lon: 35.4, tipo: "ciudad", epocas: ["patriarcas"], incierto: true },
];

/**
 * Épocas. El orden es cronológico y define el orden de los filtros.
 * `desde`/`hasta` en años (negativos = a.C.) y sirven para colorear la línea.
 */
export const EPOCAS = [
  { id: "patriarcas", es: "Patriarcas", en: "Patriarchs", desde: -2200, hasta: -1800 },
  { id: "exodo", es: "Éxodo y conquista", en: "Exodus & Conquest", desde: -1500, hasta: -1350 },
  { id: "reyes", es: "Jueces y reyes", en: "Judges & Kings", desde: -1350, hasta: -586 },
  { id: "exilio", es: "Exilio y retorno", en: "Exile & Return", desde: -605, hasta: -400 },
  { id: "jesus", es: "Jesús", en: "Jesus", desde: -5, hasta: 33 },
  { id: "iglesia", es: "Iglesia primitiva", en: "Early Church", desde: 33, hasta: 100 },
];

/**
 * @typedef {object} Evento
 * @property {number} anio  negativo = a.C.
 * @property {boolean} [aproximada]
 * @property {string} epoca
 * @property {string[]} [refs] referencias como las entiende `parseReferencia`
 */
export const CRONOLOGIA = [
  { id: "abraham-nace", anio: -2166, aproximada: true, epoca: "patriarcas", es: "Nace Abraham", en: "Abraham is born", refs: ["Gen 11:26"] },
  { id: "llamado", anio: -2091, aproximada: true, epoca: "patriarcas", es: "Llamado de Abraham", en: "The call of Abraham", refs: ["Gen 12:1"] },
  { id: "isaac", anio: -2066, aproximada: true, epoca: "patriarcas", es: "Nace Isaac", en: "Isaac is born", refs: ["Gen 21:2"] },
  { id: "jacob", anio: -2006, aproximada: true, epoca: "patriarcas", es: "Nacen Jacob y Esaú", en: "Jacob and Esau are born", refs: ["Gen 25:24"] },
  { id: "jose-vendido", anio: -1898, aproximada: true, epoca: "patriarcas", es: "José es vendido a Egipto", en: "Joseph is sold into Egypt", refs: ["Gen 37:28"] },
  { id: "jacob-egipto", anio: -1876, aproximada: true, epoca: "patriarcas", es: "Jacob se establece en Egipto", en: "Jacob settles in Egypt", refs: ["Gen 46:6"] },

  { id: "exodo", anio: -1446, aproximada: true, epoca: "exodo", es: "El Éxodo de Egipto", en: "The Exodus from Egypt", refs: ["Exo 12:41"] },
  { id: "sinai", anio: -1446, aproximada: true, epoca: "exodo", es: "La ley en el Sinaí", en: "The Law at Sinai", refs: ["Exo 19:1"] },
  { id: "conquista", anio: -1406, aproximada: true, epoca: "exodo", es: "Entrada en Canaán", en: "Entry into Canaan", refs: ["Jos 3:17"] },

  { id: "jueces", anio: -1375, aproximada: true, epoca: "reyes", es: "Periodo de los jueces", en: "Period of the judges", refs: ["Jue 2:16"] },
  { id: "saul", anio: -1050, aproximada: true, epoca: "reyes", es: "Saúl, primer rey", en: "Saul, first king", refs: ["1Sa 10:1"] },
  { id: "david", anio: -1010, aproximada: true, epoca: "reyes", es: "David reina en Hebrón", en: "David reigns in Hebron", refs: ["2Sa 2:4"] },
  { id: "jerusalen-capital", anio: -1003, aproximada: true, epoca: "reyes", es: "Jerusalén, capital", en: "Jerusalem becomes the capital", refs: ["2Sa 5:6"] },
  { id: "salomon", anio: -970, aproximada: true, epoca: "reyes", es: "Salomón rey", en: "Solomon becomes king", refs: ["1Re 2:12"] },
  { id: "templo", anio: -966, aproximada: true, epoca: "reyes", es: "Comienza el Templo", en: "Construction of the Temple begins", refs: ["1Re 6:1"] },
  { id: "division", anio: -930, aproximada: true, epoca: "reyes", es: "División del reino", en: "The kingdom divides", refs: ["1Re 12:16"] },
  { id: "elias", anio: -870, aproximada: true, epoca: "reyes", es: "Ministerio de Elías", en: "Ministry of Elijah", refs: ["1Re 17:1"] },
  { id: "eliseo", anio: -850, aproximada: true, epoca: "reyes", es: "Ministerio de Eliseo", en: "Ministry of Elisha", refs: ["2Re 2:14"] },
  { id: "amos", anio: -760, aproximada: true, epoca: "reyes", es: "Amós y Oseas profetizan", en: "Amos and Hosea prophesy", refs: ["Amo 1:1"] },
  { id: "isaias", anio: -740, aproximada: true, epoca: "reyes", es: "Comienza Isaías", en: "Isaiah begins to prophesy", refs: ["Isa 6:1"] },
  { id: "samaria-cae", anio: -722, epoca: "reyes", es: "Asiria destruye Samaria", en: "Assyria destroys Samaria", refs: ["2Re 17:6"] },
  { id: "senaquerib", anio: -701, epoca: "reyes", es: "Senaquerib sitia Jerusalén", en: "Sennacherib besieges Jerusalem", refs: ["2Re 18:13"] },
  { id: "josias", anio: -640, epoca: "reyes", es: "Reforma de Josías", en: "Josiah's reform", refs: ["2Re 22:1"] },
  { id: "jeremias", anio: -627, aproximada: true, epoca: "reyes", es: "Comienza Jeremías", en: "Jeremiah begins to prophesy", refs: ["Jer 1:2"] },

  { id: "deportacion1", anio: -605, epoca: "exilio", es: "Primera deportación; Daniel a Babilonia", en: "First deportation; Daniel taken to Babylon", refs: ["Dan 1:1"] },
  { id: "deportacion2", anio: -597, epoca: "exilio", es: "Segunda deportación; Ezequiel", en: "Second deportation; Ezekiel", refs: ["2Re 24:14"] },
  { id: "jerusalen-cae", anio: -586, epoca: "exilio", es: "Cae Jerusalén y arde el Templo", en: "Jerusalem falls; the Temple is burned", refs: ["2Re 25:9"] },
  { id: "ciro", anio: -539, epoca: "exilio", es: "Ciro toma Babilonia", en: "Cyrus takes Babylon", refs: ["Dan 5:30"] },
  { id: "retorno", anio: -538, epoca: "exilio", es: "Decreto de Ciro: comienza el retorno", en: "Decree of Cyrus: the return begins", refs: ["Esd 1:1"] },
  { id: "templo2", anio: -516, epoca: "exilio", es: "Se termina el segundo Templo", en: "The Second Temple is completed", refs: ["Esd 6:15"] },
  { id: "ester", anio: -479, aproximada: true, epoca: "exilio", es: "Ester, reina en Persia", en: "Esther becomes queen in Persia", refs: ["Est 2:17"] },
  { id: "esdras", anio: -458, epoca: "exilio", es: "Esdras vuelve a Jerusalén", en: "Ezra returns to Jerusalem", refs: ["Esd 7:8"] },
  { id: "nehemias", anio: -445, epoca: "exilio", es: "Nehemías reconstruye el muro", en: "Nehemiah rebuilds the wall", refs: ["Neh 2:17"] },
  { id: "malaquias", anio: -430, aproximada: true, epoca: "exilio", es: "Malaquías, último profeta del AT", en: "Malachi, last prophet of the OT", refs: ["Mal 1:1"] },
  { id: "alejandro", anio: -331, epoca: "exilio", es: "Alejandro Magno conquista Persia", en: "Alexander the Great conquers Persia" },
  { id: "macabeos", anio: -167, epoca: "exilio", es: "Rebelión macabea", en: "Maccabean revolt" },
  { id: "pompeyo", anio: -63, epoca: "exilio", es: "Roma toma Jerusalén", en: "Rome takes Jerusalem" },

  { id: "jesus-nace", anio: -5, aproximada: true, epoca: "jesus", es: "Nace Jesús", en: "Jesus is born", refs: ["Luc 2:7"] },
  { id: "bautismo", anio: 27, aproximada: true, epoca: "jesus", es: "Bautismo de Jesús", en: "Jesus is baptized", refs: ["Luc 3:21"] },
  { id: "crucifixion", anio: 30, aproximada: true, epoca: "jesus", es: "Crucifixión y resurrección", en: "Crucifixion and resurrection", refs: ["Luc 24:6"] },

  { id: "pentecostes", anio: 30, aproximada: true, epoca: "iglesia", es: "Pentecostés", en: "Pentecost", refs: ["Hch 2:1"] },
  { id: "esteban", anio: 34, aproximada: true, epoca: "iglesia", es: "Muere Esteban", en: "Stephen is martyred", refs: ["Hch 7:59"] },
  { id: "pablo-conversion", anio: 34, aproximada: true, epoca: "iglesia", es: "Conversión de Pablo", en: "Paul's conversion", refs: ["Hch 9:3"] },
  { id: "viaje1", anio: 46, aproximada: true, epoca: "iglesia", es: "Primer viaje misionero", en: "First missionary journey", refs: ["Hch 13:4"] },
  { id: "concilio", anio: 49, aproximada: true, epoca: "iglesia", es: "Concilio de Jerusalén", en: "Council of Jerusalem", refs: ["Hch 15:6"] },
  { id: "viaje2", anio: 49, aproximada: true, epoca: "iglesia", es: "Segundo viaje misionero", en: "Second missionary journey", refs: ["Hch 15:40"] },
  { id: "viaje3", anio: 53, aproximada: true, epoca: "iglesia", es: "Tercer viaje misionero", en: "Third missionary journey", refs: ["Hch 18:23"] },
  { id: "pablo-roma", anio: 60, aproximada: true, epoca: "iglesia", es: "Pablo preso en Roma", en: "Paul imprisoned in Rome", refs: ["Hch 28:16"] },
  { id: "neron", anio: 64, epoca: "iglesia", es: "Incendio de Roma y persecución de Nerón", en: "Fire of Rome and Nero's persecution" },
  { id: "templo-destruido", anio: 70, epoca: "iglesia", es: "Roma destruye el Templo", en: "Rome destroys the Temple", refs: ["Mat 24:2"] },
  { id: "patmos", anio: 95, aproximada: true, epoca: "iglesia", es: "Juan escribe desde Patmos", en: "John writes from Patmos", refs: ["Apo 1:9"] },
];

/**
 * Recorridos: la secuencia de lugares de un viaje.
 *
 * Es lo que hace útil un mapa de puntos. Saber dónde está Listra no dice gran
 * cosa; ver que Pablo fue de Antioquía a Chipre y de ahí subió a la meseta de
 * Galacia explica por qué las cartas van a las ciudades a las que van.
 *
 * Los puntos son `id` de `LUGARES`, en orden. Un lugar que no exista se ignora
 * al dibujar, así que la lista puede mencionar sitios que aún no están.
 */
export const ITINERARIOS = [
  {
    id: "abraham",
    es: "Viaje de Abraham",
    en: "Abraham's journey",
    epoca: "patriarcas",
    refs: ["Gen 12:1"],
    puntos: ["ur", "harán", "siquem", "betel", "hebron", "gosen", "beerseba"],
  },
  {
    id: "exodo",
    es: "Ruta del Éxodo",
    en: "The Exodus route",
    epoca: "exodo",
    refs: ["Exo 12:37"],
    // La ruta exacta se discute tanto como la ubicación del Sinaí; esta es la
    // reconstrucción tradicional del sur.
    puntos: ["gosen", "sinai", "cades", "eziongeber", "nebo", "jerico"],
  },
  {
    id: "viaje1",
    es: "Primer viaje de Pablo",
    en: "Paul's first journey",
    epoca: "iglesia",
    refs: ["Hch 13:4"],
    puntos: ["antioquia", "chipre", "pafos", "perge", "iconio", "listra", "derbe", "atalia", "antioquia"],
  },
  {
    id: "viaje2",
    es: "Segundo viaje de Pablo",
    en: "Paul's second journey",
    epoca: "iglesia",
    refs: ["Hch 15:40"],
    puntos: ["antioquia", "derbe", "listra", "troas", "filipos", "tesalonica", "berea", "atenas", "corinto", "efeso", "cesarea", "antioquia"],
  },
  {
    id: "viaje3",
    es: "Tercer viaje de Pablo",
    en: "Paul's third journey",
    epoca: "iglesia",
    refs: ["Hch 18:23"],
    puntos: ["antioquia", "efeso", "troas", "filipos", "corinto", "mileto", "tiro", "cesarea", "jerusalen"],
  },
  {
    id: "roma",
    es: "Viaje de Pablo a Roma",
    en: "Paul's voyage to Rome",
    epoca: "iglesia",
    refs: ["Hch 27:1"],
    puntos: ["cesarea", "sidon", "creta", "malta", "puteoli", "roma"],
  },
];

/** Año como se escribe: -586 -> "586 a.C.", 70 -> "70 d.C." */
export const formatearAnio = (anio, idioma = "es") => {
  const antes = anio < 0;
  const valor = Math.abs(anio);
  if (idioma === "en") return `${valor} ${antes ? "BC" : "AD"}`;
  return `${valor} ${antes ? "a.C." : "d.C."}`;
};
