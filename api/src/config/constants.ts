export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  PAYLOAD_TOO_LARGE: 413,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503
} as const

export const MESSAGES = {
  AUTH: {
    MISSING_CREDENTIALS: 'Las credenciales son obligatorias.',
    INVALID_CREDENTIALS: 'Usuario o contraseña incorrectos.',
    USER_EXISTS: 'El usuario ya se encuentra registrado.',
    LOGIN_SUCCESS: 'Inicio de sesión exitoso.',
    LOGOUT_SUCCESS: 'Cierre de sesión exitoso.',
    REGISTER_SUCCESS: 'Cuenta creada correctamente.',
    UNAUTHORIZED: 'Acceso denegado. Se requiere autenticación.',
    TOKEN_EXPIRED: 'Sesión expirada. Por favor inicie sesión nuevamente.',
    INVALID_TOKEN: 'Token de acceso inválido.'
  },
  BIBLE: {
    NOT_FOUND: 'No se encontró el capítulo solicitado.',
    VERSION_NOT_FOUND: 'Una o más versiones solicitadas no existen.',
    NO_VERSIONS: 'Debe indicar al menos una versión.',
    TOO_MANY_VERSIONS: 'Se excedió el máximo de versiones por consulta.',
    VERSE_NOT_FOUND: 'No se encontró el versículo solicitado.'
  },
  STRONGS: {
    NOT_FOUND: 'No se encontró la entrada Strong solicitada.',
    AUDIO_NOT_FOUND: 'Esta entrada no tiene audio disponible.',
    STORAGE_DISABLED: 'El almacenamiento de audio no está configurado.'
  },
  SEARCH: {
    QUERY_TOO_SHORT: 'El término de búsqueda es demasiado corto.',
    NOT_SEARCHABLE: 'Ninguna de las versiones indicadas tiene índice de búsqueda.'
  },
  UPLOAD: {
    DISABLED: 'El servicio de imágenes no está configurado en este servidor.',
    NO_FILE: 'No se recibió ningún archivo.',
    INVALID_TYPE: 'Tipo de archivo no permitido.'
  },
  DATABASE: {
    UNAVAILABLE: 'Base de datos no disponible temporalmente.',
    CONNECTION_ERROR: 'Error crítico al conectar con la base de datos.'
  },
  SERVER: {
    ERROR: 'Ocurrió un error interno en el servidor.',
    HEALTHY: 'El servicio está operativo.'
  }
} as const

export const SYSTEM = {
  DEFAULT_SALT_ROUNDS: 10,
  DEFAULT_JWT_EXPIRATION: '7d',
  COOKIE_NAME: 'token',
  ENV_PRODUCTION: 'production',
  ENV_DEVELOPMENT: 'development'
} as const

export const BIBLE = {
  /**
   * Tope de versiones por consulta.
   *
   * Va emparejado con `MAX_SELECTIONS` (src/components/ListBooks.jsx) y con
   * `MAX_PER_REQUEST` (src/services/tursoSource.js): la UI no deja elegir mas
   * de esas, y el agrupador no manda lotes mayores.
   *
   * Los tres numeros tienen que moverse juntos. Subir solo la UI deja lotes que
   * este validador rechaza con un 400, y la pantalla se queda vacia sin decir
   * por que.
   */
  MAX_VERSIONS_PER_QUERY: 25,
  TOTAL_BOOKS: 66,
  /** Ultimo libro del Antiguo Testamento. */
  LAST_OLD_TESTAMENT_BOOK: 39,
  /** Codec con el que se guarda el campo `body` de Chapters. */
  ENCODING_GZIP: 'gzip',
  ENCODING_PLAIN: 'plain',
  /** Separador entre versiculos dentro del payload descomprimido. */
  VERSE_SEPARATOR: '\u001f'
} as const

export const SEARCH = {
  MIN_QUERY_LENGTH: 3,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100
} as const

export const HISTORY = {
  /** Entradas de historial que se conservan por usuario. */
  MAX_ENTRIES: 200
} as const

export const ANNOTATIONS = {
  /**
   * Topes por usuario. No son limites de producto sino de proteccion: el
   * cliente manda el conjunto completo en cada sincronizacion, y sin tope una
   * sola peticion podria intentar escribir cientos de miles de filas.
   */
  MAX_HIGHLIGHTS: 5000,
  MAX_NOTES: 1000,
  MAX_NOTE_LENGTH: 4000
} as const

export const CROSSREFS = {
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100
} as const

export const OCCURRENCES = {
  DEFAULT_LIMIT: 25,
  /**
   * Tope duro. Con `bible` en la consulta cada pagina descomprime un capitulo
   * por versiculo devuelto, asi que el limite acota trabajo real de CPU, no
   * solo el tamano de la respuesta.
   */
  MAX_LIMIT: 50
} as const

/** Cache larga para datos inmutables (un capitulo publicado no cambia). */
export const CACHE_CONTROL = {
  IMMUTABLE: 'public, max-age=31536000, immutable',
  CATALOG: 'public, max-age=86400',
  PRIVATE: 'private, no-store'
} as const
