import rawJugadores from '../data/jugadores.json';
import rawTemporadas from '../data/temporadas.json';
import rawPartidos from '../data/partidos.json';

export type Aparicion = {
  jugador: string;
  goles?: number;
  asistencias?: number;
  amarillas?: number;
  rojas?: number;
  mvp?: boolean;
};
export type Jugador = { id: string; nombre: string; apodo?: string; dorsal: number; posicion: string };
export type Temporada = { id: string; nombre: string; plantilla: string[] };
export type Partido = {
  id: string;
  temporada: string;
  fecha: string;
  rival: string;
  local: boolean;
  competicion: string;
  golesFavor: number | null;
  golesContra: number | null;
  cronica?: string;
  apariciones: Aparicion[];
};

export const jugadores = rawJugadores as Jugador[];
export const temporadas = rawTemporadas as Temporada[];
export const partidos = [...(rawPartidos as Partido[])].sort((a, b) => a.fecha.localeCompare(b.fecha));

// Ruta con el `base` de GitHub Pages incluido
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path: string) => base + path;

export const fecha = (iso: string) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

export const jugado = (p: Partido) => p.golesFavor !== null && p.golesContra !== null;
export const getJugador = (id: string) => jugadores.find((j) => j.id === id)!;

export function resultado(p: Partido): 'V' | 'E' | 'D' | null {
  if (!jugado(p)) return null;
  if (p.golesFavor! > p.golesContra!) return 'V';
  if (p.golesFavor! < p.golesContra!) return 'D';
  return 'E';
}

export function balance(lista: Partido[]) {
  const jugados = lista.filter(jugado);
  const r = jugados.map(resultado);
  return {
    pj: jugados.length,
    v: r.filter((x) => x === 'V').length,
    e: r.filter((x) => x === 'E').length,
    d: r.filter((x) => x === 'D').length,
    gf: jugados.reduce((s, p) => s + p.golesFavor!, 0),
    gc: jugados.reduce((s, p) => s + p.golesContra!, 0),
  };
}

export type StatsJugador = {
  pj: number; goles: number; asistencias: number; amarillas: number; rojas: number; mvp: number;
};

/** Estadísticas de un jugador. Si pasas `lista`, solo cuenta esos partidos (p. ej. una temporada). */
export function statsJugador(id: string, lista: Partido[] = partidos): StatsJugador {
  const s: StatsJugador = { pj: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, mvp: 0 };
  for (const p of lista.filter(jugado)) {
    const a = p.apariciones.find((x) => x.jugador === id);
    if (!a) continue;
    s.pj++;
    s.goles += a.goles ?? 0;
    s.asistencias += a.asistencias ?? 0;
    s.amarillas += a.amarillas ?? 0;
    s.rojas += a.rojas ?? 0;
    if (a.mvp) s.mvp++;
  }
  return s;
}

/** Ranking por una estadística, de mayor a menor (ignora a los que tienen 0). */
export function ranking(campo: keyof StatsJugador, lista: Partido[] = partidos, limite = 10) {
  return jugadores
    .map((j) => ({ jugador: j, valor: statsJugador(j.id, lista)[campo] }))
    .filter((x) => x.valor > 0)
    .sort((a, b) => b.valor - a.valor)
    .slice(0, limite);
}

export const partidosDe = (temporadaId: string) => partidos.filter((p) => p.temporada === temporadaId);
export const proximoPartido = () => partidos.find((p) => !jugado(p));
export const ultimosPartidos = (n = 5) => partidos.filter(jugado).slice(-n).reverse();

// ---------- Noticias y premios ----------
import rawNoticias from '../data/noticias.json';
import rawPremios from '../data/premios.json';

export type Noticia = {
  id: string; fecha: string; tipo: 'fichaje' | 'premio' | 'partido' | 'general';
  titulo: string; resumen: string; cuerpo?: string;
};
export type Nominado = { jugador: string; detalle?: string };
export type Categoria = { id: string; nombre: string; nominados: Nominado[]; ganador: string | null };
export type Gala = { temporada: string; estado: 'votaciones' | 'entregados'; categorias: Categoria[] };

export const noticias = [...(rawNoticias as Noticia[])].sort((a, b) => b.fecha.localeCompare(a.fecha));
export const galas = [...(rawPremios as Gala[])].sort((a, b) => b.temporada.localeCompare(a.temporada));
export const etiquetaTipo: Record<Noticia['tipo'], string> = {
  fichaje: 'Fichaje', premio: 'Premios', partido: 'Partido', general: 'Club',
};
export const nombreTemporada = (id: string) => temporadas.find((t) => t.id === id)?.nombre ?? id;
export const galaAbierta = () => galas.find((g) => g.estado === 'votaciones');
