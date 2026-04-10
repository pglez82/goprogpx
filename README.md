# GoPro Video Preview

Aplicación web para previsualizar videos de GoPro y sincronizarlos con datos GPS de archivos GPX. Permite etiquetar puntos específicos del video con coordenadas GPS y exportar los datos a CSV.

## Características

- **Previsualización local**: Los videos se reproducen directamente en el navegador sin subirlos a ningún servidor.
- **Extracción de metadatos**: Utiliza la librería `gpmf-extract` para obtener el timestamp exacto del video desde los metadatos GPMF de GoPro.
- **Sincronización GPS**: Carga archivos GPX y sincroniza las coordenadas GPS con el tiempo del video.
- **Etiquetado de puntos**: Permite etiquetar frames específicos con texto y valores numéricos, asociándolos con coordenadas GPS.
- **Exportación CSV**: Exporta los puntos etiquetados a un archivo CSV para análisis posterior.

## Tecnologías utilizadas

- **React + Vite**: Framework frontend moderno y rápido.
- **gpmf-extract**: Librería para extraer metadatos GPMF de videos GoPro.
- **DOMParser**: Para parsear archivos GPX XML.

## Instalación y uso

1. Clona el repositorio:
   ```bash
   git clone https://github.com/pglez82/goprogpx.git
   cd goprogpx
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Ejecuta en modo desarrollo:
   ```bash
   npm run dev
   ```

4. Abre http://localhost:5173 en tu navegador.

## Despliegue en GitHub Pages

El proyecto está configurado para desplegarse automáticamente en GitHub Pages usando GitHub Actions.

1. Sube el código a un repositorio de GitHub llamado `goprogpx`.
2. Ve a Settings > Pages y selecciona "GitHub Actions" como source.
3. El workflow se ejecutará automáticamente en cada push a la rama main.

## Créditos

- **Creado por**: Pablo González
- **Ideado por**: Fernando Álvarez
- **Instituciones**: Universidad de Oviedo & Instituto Español de Oceanografía

## Licencia

Este proyecto es de código abierto. Consulta el archivo LICENSE para más detalles.