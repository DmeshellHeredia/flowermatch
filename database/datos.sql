-- FlowerMatch: Datos de ejemplo
-- Ejecutar después de schema.sql: mysql -u root -p flowermatch < database/datos.sql

SET NAMES utf8mb4;

USE flowermatch;

INSERT INTO flores (nombre, color, ocasion, precio, descripcion, imagen) VALUES
('Rosa Roja',       'Rojo',          'romance,amor,aniversario',           25.00, 'La reina de las flores, símbolo universal del amor romántico. Sus pétalos aterciopelados y su fragancia inigualable la hacen perfecta para expresar sentimientos profundos.',        '/imagenes/flores/Rosa Roja.jpg'),
('Girasol',         'Amarillo',      'amistad,cumpleaños,alegría',          15.00, 'Flor del sol y la alegría. Su gran tamaño y color vibrante llenan cualquier espacio de positividad. Ideal para celebrar la amistad y los momentos felices.',                       '/imagenes/flores/Girasol.jpg'),
('Tulipán Morado',  'Morado',        'disculpa,amor,primavera',             20.00, 'Elegante y sofisticado, el tulipán morado representa la realeza y los sentimientos profundos. Perfecto para pedir perdón con clase.',                                               '/imagenes/flores/Tulipán Morado.jpg'),
('Lirio Blanco',    'Blanco',        'aniversario,boda,pureza',             30.00, 'Símbolo de pureza y elegancia. El lirio blanco es la elección perfecta para bodas, aniversarios y celebraciones especiales de amor eterno.',                                         '/imagenes/flores/Lirio Blanco.jpg'),
('Margarita',       'Blanco',        'amistad,cumpleaños,alegría',          10.00, 'Simple y encantadora, la margarita evoca inocencia y alegría. Perfecta para expresar cariño genuino a amigos y seres queridos.',                                                     '/imagenes/flores/Margarita.jpg'),
('Orquídea Púrpura','Morado',        'aniversario,lujo,admiración',         45.00, 'La más exótica y sofisticada de las flores. La orquídea representa lujo, admiración y amor maduro. Un regalo verdaderamente especial para ocasiones únicas.',                         '/imagenes/flores/Orquídea Púrpura.jpg'),
('Clavel Rosado',   'Rosado',        'disculpa,amor,gratitud',              12.00, 'Flor de la gratitud y el afecto sincero. El clavel rosado es ideal para expresar amor verdadero, pedir disculpas o agradecer de corazón.',                                           '/imagenes/flores/Clavel Rosado.jpeg'),
('Amapola Roja',    'Rojo',          'romance,pasión,recuerdo',             18.00, 'Símbolo de pasión y recuerdo. La amapola roja transmite emociones intensas y genuinas, perfecta para declaraciones románticas.',                                                     '/imagenes/flores/Amapola Roja.jpg'),
('Hortensia Azul',  'Azul',          'aniversario,boda,agradecimiento',     35.00, 'Con sus flores en forma de bola, la hortensia azul representa gratitud profunda y amor duradero. Perfecta para celebrar años de unión.',                                             '/imagenes/flores/Hortensia Azul.jpg'),
('Gerbera Naranja', 'Naranja',       'amistad,cumpleaños,energía',          14.00, 'Alegre y llena de vida, la gerbera naranja irradia energía positiva. La elección perfecta para celebraciones y para alegrar el día de alguien especial.',                            '/imagenes/flores/Gerbera Naranja.jpeg'),
('Lavanda',         'Morado claro',  'relajación,bienestar,serenidad',      22.00, 'Más que una flor, la lavanda es una experiencia sensorial. Su fragancia calmante y su hermoso color morado la hacen ideal para transmitir serenidad y cuidado.',                      '/imagenes/flores/Lavanda.jpg'),
('Peonía Rosa',     'Rosado',        'romance,boda,prosperidad',            40.00, 'Exuberante y romántica, la peonía rosa es símbolo de buena fortuna y amor floreciente. Una de las flores más solicitadas para bodas y celebraciones románticas.',                     '/imagenes/flores/Peonía Rosa.jpg');
