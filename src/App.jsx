import { useEffect, useRef, useState } from 'react';
import logoUO from '/logo-uo.png';
import logoIEO from '/logo-ieo.png';

const loadGpmfExtract = async () => {
  const module = await import('gpmf-extract');
  return module.default ?? module.GPMFExtract ?? module;
};

const extractGpmfTimestamp = async (file) => {
  try {
    const GPMFExtract = await loadGpmfExtract();
    const result = await GPMFExtract(file, { browserMode: true, useWorker: true });
    console.log(result);
    return result?.timing?.start ?? null;
    
  } catch (error) {
    console.warn('GPMF extraction failed:', error);
    return null;
  }
};

const parseVideoStartTime = (fileName, lastModified) => {
  const candidates = [
    /(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, // 20241001103408
    /(\d{4})-(\d{2})-(\d{2})[ _](\d{2})\.(\d{2})\.(\d{2})/, // 2024-10-01 10.34.08
  ];

  for (const pattern of candidates) {
    const match = fileName.match(pattern);
    if (!match) continue;
    const [, year, month, day, hour, minute, second] = match;
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`);
  }

  return lastModified ? new Date(lastModified) : null;
};

const formatSeconds = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = (seconds % 60).toFixed(3);
  return [hours, minutes, secs]
    .map((value, index) => {
      if (index === 2) {
        return value.padStart(6, '0');
      }
      return String(value).padStart(2, '0');
    })
    .join(':');
};

const formatTimestamp = (date) => {
  if (!date) {
    return 'Unknown';
  }
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

const parseGpxFile = async (file) => {
  const text = await file.text();
  const parser = new DOMParser();
  const xml = parser.parseFromString(text, 'application/xml');
  const points = Array.from(xml.querySelectorAll('trkpt')).map((node) => {
    const lat = Number.parseFloat(node.getAttribute('lat'));
    const lon = Number.parseFloat(node.getAttribute('lon'));
    const timeText = node.querySelector('time')?.textContent;
    const time = timeText ? new Date(timeText) : null;
    return { lat, lon, time, rawTime: timeText };
  });
  return points.filter((point) => point.time && !Number.isNaN(point.lat) && !Number.isNaN(point.lon));
};

const findNearestGPXPoint = (points, timestamp, thresholdMs = 10000) => {
  if (!timestamp || points.length === 0) {
    return null;
  }

  let best = null;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const point of points) {
    const diff = Math.abs(point.time - timestamp);
    if (diff < bestDistance) {
      bestDistance = diff;
      best = point;
    }
  }

  return bestDistance <= thresholdMs ? { ...best, distanceMs: bestDistance } : null;
};

function App() {
  const videoRef = useRef(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [videoStartTime, setVideoStartTime] = useState(null);
  const [timestampLabel, setTimestampLabel] = useState('');
  const [relativeLabel, setRelativeLabel] = useState('00:00:00.000');
  const [gpxFileName, setGpxFileName] = useState('');
  const [gpxPoints, setGpxPoints] = useState([]);
  const [nearestPoint, setNearestPoint] = useState(null);
  const [taggedPoints, setTaggedPoints] = useState([]);
  const [etiqueta, setEtiqueta] = useState('');
  const [cobertura, setCobertura] = useState('');
  const [isLoadingTimestamp, setIsLoadingTimestamp] = useState(false);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const updatePosition = (currentSeconds) => {
    setRelativeLabel(formatSeconds(currentSeconds));

    if (isLoadingTimestamp || !videoStartTime) {
      return;
    }

    const currentDate = new Date(videoStartTime.getTime() + currentSeconds * 1000);
    setTimestampLabel(formatTimestamp(currentDate));

    if (gpxPoints.length > 0) {
      const nearest = findNearestGPXPoint(gpxPoints, currentDate);
      setNearestPoint(nearest);
    }
  };

  const handleVideoFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    setFileName(file.name);
    setRelativeLabel('00:00:00.000');
    setNearestPoint(null);
    setIsLoadingTimestamp(true);
    setTimestampLabel('Loading...');

    const parseFile = async () => {
      const gpmfTime = await extractGpmfTimestamp(file);
      setIsLoadingTimestamp(false);
      if (gpmfTime) {
        setVideoStartTime(gpmfTime);
        setTimestampLabel(formatTimestamp(gpmfTime));
        if (videoRef.current) {
          updatePosition(videoRef.current.currentTime);
        }
      } else {
        setTimestampLabel('Unknown start time');
      }
    };

    parseFile();
  };

  const handleGpxFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const points = await parseGpxFile(file);
    setGpxPoints(points);
    setGpxFileName(file.name);
    setNearestPoint(null);

    if (videoRef.current?.currentTime && points.length > 0 && videoStartTime) {
      updatePosition(videoRef.current.currentTime);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) {
      return;
    }
    updatePosition(videoRef.current.currentTime);
  };

  const handleSeeked = handleTimeUpdate;

  const addTaggedPoint = () => {
    if (!videoRef.current || !nearestPoint || !etiqueta.trim() || !cobertura) return;

    const currentSeconds = videoRef.current.currentTime;
    const currentDate = new Date(videoStartTime.getTime() + currentSeconds * 1000);

    const newPoint = {
      timestamp: currentDate,
      lat: nearestPoint.lat,
      lon: nearestPoint.lon,
      etiqueta: etiqueta.trim(),
      cobertura: Number(cobertura),
    };

    setTaggedPoints(prev => [...prev, newPoint]);
    setEtiqueta('');
    setCobertura('');
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Latitude', 'Longitude', 'Etiqueta', 'Cobertura'];
    const rows = taggedPoints.map(point => [
      `"${formatTimestamp(point.timestamp)}"`,
      point.lat.toFixed(6),
      point.lon.toFixed(6),
      point.etiqueta,
      point.cobertura,
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tagged_points.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteTaggedPoint = (index) => {
    setTaggedPoints(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <main className="app-shell">
      <header className="header">
        <div className="logos">
          <img src={logoUO} alt="Universidad de Oviedo" className="logo" />
          <img src={logoIEO} alt="Instituto Español de Oceanografía" className="logo" />
        </div>
        <h1 className="subtitle">Sincronización de videos con datos GPS</h1>
      </header>

      <section className="card">
        <h2>Seleccionar Archivos</h2>
        <p>Selecciona un video de GoPro y un archivo GPX para sincronizar coordenadas GPS con el tiempo del video.</p>

        <label className="file-label">
          <span>Seleccionar video de GoPro</span>
          <input
            type="file"
            accept="video/mp4,video/*"
            onChange={handleVideoFileChange}
          />
        </label>

        <label className="file-label">
          <span>Cargar archivo GPX</span>
          <input
            type="file"
            accept=".gpx,application/gpx+xml,text/xml"
            onChange={handleGpxFileChange}
          />
        </label>

        {videoUrl ? (
          <div className="video-preview">
            <div className="metadata-row">
              <div>
                <p className="label">Archivo Video</p>
                <p className="file-name">{fileName}</p>
              </div>
              <div>
                <p className="label">Tiempo relativo</p>
                <p className="status-chip">{relativeLabel}</p>
              </div>
              <div>
                <p className="label">Timestamp estimado</p>
                <p className="status-chip">{timestampLabel}</p>
              </div>
            </div>

            <video
              ref={videoRef}
              controls
              src={videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onSeeked={handleSeeked}
              onLoadedMetadata={() => updatePosition(0)}
            >
              <track kind="captions" src="" srcLang="en" label="No captions" default />
            </video>

            {gpxFileName ? (
              <div className="gpx-info">
                <p className="label">GPX file</p>
                <p className="file-name">{gpxFileName}</p>
                {nearestPoint ? (
                  <div className="coordinate-card">
                    <p className="label">Nearest GPX point</p>
                    <p>Latitud: {nearestPoint.lat.toFixed(6)}</p>
                    <p>Longitud: {nearestPoint.lon.toFixed(6)}</p>
                    <p>GPX timestamp: {formatTimestamp(nearestPoint.time)}</p>
                    <p>Δ: {(nearestPoint.distanceMs / 1000).toFixed(2)} sec</p>
                  </div>
                ) : (
                  <p className="placeholder">Coordenadas no encontradas.</p>
                )}
              </div>
            ) : (
              <p className="placeholder">Carga un GPX para cuadrarlo con los timestamps del video y sacar las localizaciones.</p>
            )}

            {nearestPoint && (
              <div className="tag-section">
                <h3>Etiqueta el frame actual</h3>
                <div className="input-row">
                  <input
                    type="text"
                    placeholder="Etiqueta"
                    value={etiqueta}
                    onChange={(e) => setEtiqueta(e.target.value)}
                  />
                  <input
                    type="number"
                    placeholder="Cobertura"
                    value={cobertura}
                    onChange={(e) => setCobertura(e.target.value)}
                  />
                  <button onClick={addTaggedPoint}>Añadir</button>
                </div>
              </div>
            )}

            {taggedPoints.length > 0 && (
              <div className="tagged-points">
                <h3>Frames etiquetados</h3>
                <ul>
                  {taggedPoints.map((point, index) => (
                    <li key={point.timestamp.getTime()} className="point-item">
                      <div>
                        <strong>{point.etiqueta}</strong> - Cobertura: {point.cobertura}
                        <br />
                        Timestamp: {formatTimestamp(point.timestamp)}
                        <br />
                        Lat: {point.lat.toFixed(6)}, Lon: {point.lon.toFixed(6)}
                      </div>
                      <button onClick={() => deleteTaggedPoint(index)}>Borrar</button>
                    </li>
                  ))}
                </ul>
                <button onClick={exportToCSV}>Exportar CSV</button>
              </div>
            )}
          </div>
        ) : (
          <p className="placeholder">No se ha seleccionado ningún video.</p>
        )}
      </section>

      <footer className="footer">
        <p>Creada por <strong>Pablo González (Uniovi)</strong> | Ideada por <strong>Fernando García (IEO)</strong></p>
        <p>Universidad de Oviedo & Instituto Español de Oceanografía</p>
      </footer>
    </main>
  );
}

export default App;
