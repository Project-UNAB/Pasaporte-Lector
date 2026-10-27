// ─────────────────────────────────────────────────────────────────────────────
//  CONTENIDO EDITABLE DE PASAPORTE LECTOR
//  Todo lo que cambia el cliente vive aquí: textos, paradas, coordenadas,
//  tarjetas culturales y marcas de agua. Las PALABRAS CLAVE NO van aquí
//  (viven en claves.json, que es privado, y se cargan a Supabase como hash).
//
//  Si cambias el id o el orden de una parada, actualiza también claves.json
//  y vuelve a ejecutar `npm run claves`.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  dominioCorreo: 'unab.edu.co',
  // Formato del ID estudiantil. Por defecto: 182088 o U00182088.
  formatoId: /^(U\d{8}|\d{5,10})$/i,
  ejemploId: '182088 o U00182088',
  horasLimite: 24,
  // Radio en metros si una parada no define el suyo.
  radioPorDefecto: 40,
  // Intentos de ubicación fallidos antes de mostrar el botón de ayuda (3 a 5).
  intentosParaAyuda: 3,
  // Segundos entre reenvíos del código por correo (Supabase exige 60).
  segundosReenvio: 60,
  // 'bloque' = 3 sellos, 'parada' = 9 sellos.
  sellosPor: 'bloque',
  // Centro del mapa (UNAB sede Jardín) y zoom inicial.
  centroMapa: { lat: 7.11695, lng: -73.10505 },
  zoomMapa: 18,
}

export const textos = {
  nombreProyecto: 'Pasaporte Lector',
  bienvenidaTitulo: 'Tu próxima aventura empieza leyendo',
  bienvenidaTexto: 'Recorre 3 destinos de la universidad y gana tu pasaporte.',
  bienvenidaBoton: 'Crear cuenta',
  bienvenidaBotonEntrar: 'Iniciar sesión',
  bienvenidaNota: 'Con tu correo institucional y un código de verificación',
  // PENDIENTE: texto definitivo entregado por Bienestar Estudiantil (Ley 1581 de 2012).
  autorizacionDatos:
    'Autorizo a la Universidad Autónoma de Bucaramanga y al equipo de Pasaporte Lector a tratar mis datos ' +
    'personales (correo, nombre, ID estudiantil, carrera, foto y avance en el juego) con el fin de gestionar ' +
    'esta actividad de lectura, conforme a la Ley 1581 de 2012.',
  bibliotecaInstrucciones:
    'Sube al segundo piso, cuéntale al equipo de la biblioteca que vienes de la actividad de lectura y participa. ' +
    'Cuando ingresen el código en tu celular, se abrirá tu pasaporte.',
  pasaporteEncabezado: 'República de la Lectura · Pasaporte',
}

export const carreras = [
  'Administración de Empresas',
  'Artes Audiovisuales',
  'Bioingeniería',
  'Comunicación Social',
  'Contaduría Pública',
  'Derecho',
  'Economía',
  'Enfermería',
  'Gastronomía y Alta Cocina',
  'Ingeniería Biomédica',
  'Ingeniería de Sistemas',
  'Ingeniería en Energía',
  'Ingeniería Financiera',
  'Ingeniería Industrial',
  'Ingeniería Mecatrónica',
  'Licenciatura en Educación Infantil',
  'Literatura',
  'Medicina',
  'Música',
  'Negocios Internacionales',
  'Psicología',
]

// Coordenadas de PRUEBA cerca del campus. Reemplazar por las tomadas con /calibrar.
export const bloques = [
  {
    id: 'b1',
    nombre: 'Ruta de la Poesía',
    zona: 'El D',
    icono: '🖋️',
    paradas: [
      {
        id: 'b1-p1',
        lugar: 'Estación 42',
        pista: 'En el edificio D, en Estación 42.',
        lat: 7.11712,
        lng: -73.10531,
        radio: 40,
        tarjeta: {
          titulo: 'El poeta de las fábulas',
          autor: 'Rafael Pombo',
          texto:
            'Rafael Pombo (Bogotá, 1833-1912) es uno de los grandes poetas de Colombia. Sus fábulas en verso, ' +
            'como «El renacuajo paseador» y «Simón el bobito», las han recitado generaciones de niños colombianos.',
        },
      },
      {
        id: 'b1-p2',
        lugar: 'Auditorio Mayor',
        pista: 'En el edificio D, en el Auditorio Mayor.',
        lat: 7.11698,
        lng: -73.10548,
        radio: 40,
        tarjeta: {
          titulo: 'Un Nobel que escribió al amor',
          autor: 'Pablo Neruda',
          texto:
            'El chileno Pablo Neruda (1904-1973) ganó el Premio Nobel de Literatura en 1971. Su libro «Veinte ' +
            'poemas de amor y una canción desesperada» es uno de los poemarios más leídos en lengua española.',
        },
      },
      {
        id: 'b1-p3',
        lugar: 'La Colmena',
        pista: 'En el edificio D, en La Colmena.',
        lat: 7.11684,
        lng: -73.10522,
        radio: 40,
        tarjeta: {
          titulo: 'El Nocturno de Colombia',
          autor: 'José Asunción Silva',
          texto:
            'José Asunción Silva (Bogotá, 1865-1896) fue una figura clave del modernismo. Su «Nocturno III» es ' +
            'uno de los poemas más conocidos de la literatura colombiana.',
        },
      },
    ],
    tarjetaFinal: {
      titulo: 'Bloque completado: la voz de la poesía',
      texto:
        'De las fábulas de Pombo a los versos de Neruda y Silva, la poesía en español ha llevado las voces de ' +
        'Latinoamérica por todo el mundo. En 1945, la chilena Gabriela Mistral fue la primera persona ' +
        'latinoamericana en recibir el Nobel de Literatura.',
    },
  },
  {
    id: 'b2',
    nombre: 'Ruta del Teatro',
    zona: 'El L de Ingenierías',
    icono: '🎭',
    paradas: [
      {
        id: 'b2-p1',
        lugar: 'Por definir',
        pista: 'En el edificio L de Ingenierías.',
        lat: 7.11665,
        lng: -73.10478,
        radio: 40,
        tarjeta: {
          titulo: 'El dramaturgo más representado',
          autor: 'William Shakespeare',
          texto:
            'William Shakespeare (1564-1616) escribió obras como «Romeo y Julieta» y «Hamlet». Es considerado uno ' +
            'de los dramaturgos más importantes de la historia y sus obras se siguen representando en todo el mundo.',
        },
      },
      {
        id: 'b2-p2',
        lugar: 'Por definir',
        pista: 'En el edificio L de Ingenierías.',
        lat: 7.11652,
        lng: -73.10462,
        radio: 40,
        tarjeta: {
          titulo: 'Teatro con raíz popular',
          autor: 'Federico García Lorca',
          texto:
            'El español Federico García Lorca (1898-1936) escribió «Bodas de sangre» y «La casa de Bernarda Alba». ' +
            'Sus obras mezclan poesía, tradición popular y tragedia, y se estudian y se montan hasta hoy.',
        },
      },
      {
        id: 'b2-p3',
        lugar: 'Por definir',
        pista: 'En el edificio L de Ingenierías.',
        lat: 7.11640,
        lng: -73.10480,
        radio: 40,
        tarjeta: {
          titulo: 'El teatro colombiano que cambió el rumbo',
          autor: 'Enrique Buenaventura',
          texto:
            'Enrique Buenaventura (Cali, 1925-2003) dirigió el Teatro Experimental de Cali y fue uno de los grandes ' +
            'renovadores del teatro latinoamericano. Impulsó la «creación colectiva», donde las obras se construyen ' +
            'entre todo el grupo.',
        },
      },
    ],
    tarjetaFinal: {
      titulo: 'Bloque completado: el poder de la escena',
      texto:
        'El teatro nació en la Grecia antigua y sigue vivo: lo mismo se hace en un teatro de Londres que en una ' +
        'sala de Cali. Cada obra es distinta cada vez que se actúa.',
    },
  },
  {
    id: 'b3',
    nombre: 'Ruta de la Narrativa',
    zona: 'La biblioteca',
    icono: '📚',
    paradas: [
      {
        id: 'b3-p1',
        lugar: 'Por definir',
        pista: 'En la biblioteca.',
        lat: 7.11730,
        lng: -73.10470,
        radio: 40,
        tarjeta: {
          titulo: 'El inventor de la novela moderna',
          autor: 'Miguel de Cervantes',
          texto:
            'Miguel de Cervantes (1547-1616) publicó «Don Quijote de la Mancha» en dos partes (1605 y 1615). ' +
            'Muchos lo consideran la primera novela moderna.',
        },
      },
      {
        id: 'b3-p2',
        lugar: 'Por definir',
        pista: 'En la biblioteca.',
        lat: 7.11742,
        lng: -73.10458,
        radio: 40,
        tarjeta: {
          titulo: 'Una novela del Valle del Cauca',
          autor: 'Jorge Isaacs',
          texto:
            'Jorge Isaacs (Cali, 1837-1895) publicó «María» en 1867. Es una de las novelas románticas más ' +
            'importantes de Colombia y de toda Hispanoamérica.',
        },
      },
      {
        id: 'b3-p3',
        lugar: 'Por definir',
        pista: 'En la biblioteca.',
        lat: 7.11752,
        lng: -73.10474,
        radio: 40,
        tarjeta: {
          titulo: 'Macondo para el mundo',
          autor: 'Gabriel García Márquez',
          texto:
            'Gabriel García Márquez (Aracataca, 1927-2014) publicó «Cien años de soledad» en 1967 y ganó el Premio ' +
            'Nobel de Literatura en 1982. Macondo, el pueblo de la novela, es uno de los lugares imaginarios más ' +
            'famosos de la literatura.',
        },
      },
    ],
    tarjetaFinal: {
      titulo: 'Último paso: la Biblioteca',
      texto:
        '¡Lo lograste! Ahora sube al segundo piso, cuéntales que vienes de esta aventura y participa en la ' +
        'actividad. Cuando el equipo de la biblioteca ingrese el código, se abrirá tu pasaporte.',
    },
  },
]

// 20 marcas de agua. `svg` apunta a public/marcas/NN.svg cuando exista el dibujo final;
// mientras tanto se usa el emoji como marcador provisional.
// Solo la marca de la UNAB (13) tiene `color`: es el símbolo oficial en un solo color y se
// pinta con el color que se escriba aquí (por ejemplo '#0f6b57' para verde o '#ffffff' para blanco).
export const marcasDeAgua = [
  { id: 1, nombre: 'Rana dorada', emoji: '🐸', svg: '/marcas/01.svg' },
  { id: 2, nombre: 'Colibrí', emoji: '🐦', svg: '/marcas/02.svg' },
  { id: 3, nombre: 'Palma de cera', emoji: '🌴', svg: '/marcas/03.svg' },
  { id: 4, nombre: 'Tortuga marina', emoji: '🐢', svg: '/marcas/04.svg' },
  { id: 5, nombre: 'Cóndor de los Andes', emoji: '🦅', svg: '/marcas/05.svg' },
  { id: 6, nombre: 'Chigüiro', emoji: '🦫', svg: '/marcas/06.svg' },
  { id: 7, nombre: 'Tigrillo', emoji: '🐆', svg: '/marcas/07.svg' },
  { id: 8, nombre: 'Oso de anteojos', emoji: '🐻', svg: '/marcas/08.svg' },
  { id: 9, nombre: 'Delfín rosado', emoji: '🐬', svg: '/marcas/09.svg' },
  { id: 10, nombre: 'Frailejón', emoji: '🌿', svg: '/marcas/10.svg' },
  { id: 11, nombre: 'Mariposa morpho azul', emoji: '🦋', svg: '/marcas/11.svg' },
  { id: 12, nombre: 'Hormiga culona', emoji: '🐜', svg: '/marcas/12.svg' },
  { id: 13, nombre: 'Torre de la universidad', emoji: '🏛️', svg: '/marcas/13.svg', color: '#f5a300' },
  { id: 14, nombre: 'Orquídea', emoji: '🌸', svg: '/marcas/14.svg' },
  { id: 15, nombre: 'Guacamaya', emoji: '🦜', svg: '/marcas/15.svg' },
  { id: 16, nombre: 'Tucán', emoji: '🐤', svg: '/marcas/16.svg' },
  { id: 17, nombre: 'Gallito de roca', emoji: '🐓', svg: '/marcas/17.svg' },
  { id: 18, nombre: 'Jaguar', emoji: '🐅', svg: '/marcas/18.svg' },
  { id: 19, nombre: 'Planta de café', emoji: '☕', svg: '/marcas/19.svg' },
  { id: 20, nombre: 'Ballena jorobada', emoji: '🐋', svg: '/marcas/20.svg' },
]

// Lista plana de las 9 paradas en orden (1..9). No editar: se calcula sola.
export const paradas = bloques
  .flatMap((b, bi) => b.paradas.map((p, pi) => ({ ...p, bloqueId: b.id, bloqueIndice: bi, indiceEnBloque: pi })))
  .map((p, i) => ({ ...p, posicion: i + 1 }))
