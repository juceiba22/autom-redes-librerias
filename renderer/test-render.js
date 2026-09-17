const fs = require('fs');
const path = require('path');
const { renderCarousel } = require('./src/renderer');

async function test() {
  console.log('--- Iniciando prueba de renderizado de carrusel ---');
  
  const payload = {
    book: {
      title: 'Cien años de soledad',
      author: 'Gabriel García Márquez',
      genre: 'Realismo Mágico'
    },
    bookstore: {
      name: 'Librería El Ateneo',
      instagramHandle: '@elateneoliterario',
      brandPrimaryColor: '#1E293B',
      brandAccentColor: '#C2410C'
    },
    slides: [
      {
        type: 'cover_hook',
        title: '¿POR QUÉ ESTA NOVELA CAMBIÓ LA LITERATURA PARA SIEMPRE?',
        subtitle: 'Un viaje inolvidable a Macondo y sus secretos'
      },
      {
        type: 'quote',
        quote: 'Muchos años después, frente al pelotón de fusilamiento, el coronel Aureliano Buendía había de recordar aquella tarde remota en que su padre lo llevó a conocer el hielo.',
        subtitle: 'Página inicial más famosa de la literatura'
      },
      {
        type: 'synopsis',
        title: 'LA HISTORIA DE SIETE GENERACIONES',
        body: 'La saga de la familia Buendía en el pueblo mítico de Macondo. Pasión, milagros, guerras civiles y una soledad compartida que trasciende el tiempo y el olvido.'
      },
      {
        type: 'highlights',
        title: '¿POR QUÉ DEBES LEERLO ESTE MES?',
        body: 'Una prosa hipnótica donde lo extraordinario se vuelve cotidiano. Si buscas una lectura que te envuelva y no te suelte, esta es la obra cumbre.'
      },
      {
        type: 'cta',
        title: 'DISPONIBLE EN NUESTRA LIBRERÍA',
        body: 'Pídelo hoy mismo con entrega inmediata o visítanos en nuestro local.'
      }
    ]
  };

  const result = await renderCarousel(payload);
  console.log('Carrusel generado exitosamente. Diapositivas generadas:', result.slides.length);
  
  // Guardar la primera diapositiva como archivo de prueba
  const base64Data = result.slides[0].base64.replace(/^data:image\/png;base64,/, '');
  const outputPath = path.join(__dirname, 'test-slide-1.png');
  fs.writeFileSync(outputPath, Buffer.from(base64Data, 'base64'));
  console.log('Imagen de prueba guardada en:', outputPath);
  console.log('Tamaño de archivo PNG:', fs.statSync(outputPath).size, 'bytes');
}

test().catch(console.error);
