import rawJugadores from '../data/jugadores.json';
import rawTemporadas from '../data/temporadas.json';
import rawPartidos from '../data/partidos.json';

export type Aparicion = {
  jugador: string;
  goles?: number;
  asistencias?: number;
  propia?: number;      // goles en propia puerta de este jugador (suman al rival)
  amarillas?: number;
  rojas?: number;
  mvp?: boolean;
};
export type Jugador = { id: string; nombre: string; apodo?: string; dorsal: number; posicion: string };
export type Temporada = { id: string; nombre: string; plantilla: string[]; apoyo?: string[]; splitActual?: number; divisiones?: Record<string, number> };
export type Partido = {
  id: string;
  temporada: string;
  fecha: string;
  rival: string;
  local: boolean;
  split: number;                 // 1, 2 o 3
  fase: 'grupos' | 'playoff';
  jornada?: number;              // solo en fase de grupos
  nota?: string;                 // p. ej. "Ganamos en los penaltis"
  propiaRival?: number;          // goles a nuestro favor marcados en propia puerta por el rival
  incomparecencia?: 'rival' | 'nosotros'; // quién no se presentó (resultado por reglamento, sin alineación ni goles)
  golesFavor: number | null;
  golesContra: number | null;
  cronica?: string;
  apariciones: Aparicion[];
};

export const jugadores = rawJugadores as Jugador[];
export const temporadas = rawTemporadas as Temporada[];
/** Las fechas se escriben DD-MM-AAAA (también vale AAAA-MM-DD). Aquí se pasan a AAAA-MM-DD, que es lo que
 *  permite ordenarlas y compararlas bien, y se avisa con claridad si alguna no es válida. */
function normalizarFecha(valor: string, donde: string): string {
  const dmy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(valor);
  const iso = dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : valor;
  const [, m, d] = iso.split('-').map(Number);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || m < 1 || m > 12 || d < 1 || d > 31) {
    throw new Error(`Fecha no válida en ${donde}: "${valor}". El formato es DD-MM-AAAA, por ejemplo 19-02-2023.`);
  }
  return iso;
}

export const partidos = (rawPartidos as Partido[])
  .map((p) => ({ ...p, fecha: normalizarFecha(p.fecha, `el partido "${p.id}"`) }))
  .sort((a, b) => a.fecha.localeCompare(b.fecha));

// Ruta con el `base` de GitHub Pages incluido
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const url = (path: string) => base + path;

/** Fecha para mostrar: DD-MM-AAAA */
export const fecha = (f: string) => normalizarFecha(f, 'una fecha').split('-').reverse().join('-');

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
  propias: number;
  pj: number; goles: number; asistencias: number; amarillas: number; rojas: number; mvp: number;
};

/** Estadísticas de un jugador. Si pasas `lista`, solo cuenta esos partidos (p. ej. una temporada). */
export function statsJugador(id: string, lista: Partido[] = partidos): StatsJugador {
  const s: StatsJugador = { propias: 0, pj: 0, goles: 0, asistencias: 0, amarillas: 0, rojas: 0, mvp: 0 };
  for (const p of lista.filter(jugado)) {
    const a = p.apariciones.find((x) => x.jugador === id);
    if (!a) continue;
    s.pj++;
    s.goles += a.goles ?? 0;
    s.asistencias += a.asistencias ?? 0;
    s.amarillas += a.amarillas ?? 0;
    s.rojas += a.rojas ?? 0;
    s.propias += a.propia ?? 0;
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
  fotos?: string[];   // nombres de archivo dentro de public/noticias/<id>/
  portada?: string;   // la foto principal; si no se pone, la primera de `fotos`
  destacada?: boolean; // las destacadas salen en el carrusel de la portada
};
export type Nominado = { jugador: string; detalle?: string; puntos?: number };
export type Categoria = { id: string; nombre: string; nominados: Nominado[]; ganador: string | null };
export type Gala = { temporada: string; estado: 'votaciones' | 'entregados'; categorias: Categoria[] };

export const noticias = (rawNoticias as Noticia[])
  .map((n) => ({ ...n, fecha: normalizarFecha(n.fecha, `la noticia "${n.id}"`) }))
  .sort((a, b) => b.fecha.localeCompare(a.fecha));
export const galas = [...(rawPremios as Gala[])].sort((a, b) => b.temporada.localeCompare(a.temporada));
export const etiquetaTipo: Record<Noticia['tipo'], string> = {
  fichaje: 'Fichaje', premio: 'Premios', partido: 'Partido', general: 'Club',
};
export const nombreTemporada = (id: string) => temporadas.find((t) => t.id === id)?.nombre ?? id;
export const galaAbierta = () => galas.find((g) => g.estado === 'votaciones');

// ---------- Splits, grupos y play-off ----------
import rawGrupos from '../data/grupos.json';

export const nombreClub = 'Gordos FC'
export const PLAZAS_PLAYOFF = 2;              // clasifican los N primeros de cada grupo
const PUNTOS_VICTORIA = 3;
const PUNTOS_EMPATE = 1;

type ResultadoAjeno = { incomparecencia?: boolean; jornada?: number; fecha?: string; local: string; visitante: string; golesLocal: number; golesVisitante: number };
type Grupo = { temporada: string; split: number; grupoFinalizado?: boolean; clasificado?: boolean; resultados: ResultadoAjeno[] };
const grupos = (rawGrupos as Grupo[]).map((g) => ({
  ...g,
  resultados: g.resultados.map((r) =>
    r.fecha ? { ...r, fecha: normalizarFecha(r.fecha, `un resultado de ${g.temporada} (split ${g.split})`) } : r),
}));
const grupoDe = (temporadaId: string, split: number) =>
  grupos.find((g) => g.temporada === temporadaId && g.split === split);

export const etiquetaPartido = (p: Partido) =>
  `Split ${p.split} · ${p.fase === 'playoff' ? 'Play-off de ascenso' : p.jornada ? `Jornada ${p.jornada}` : 'Fase de grupos'}`;

/** Splits que existen en una temporada (por sus partidos o por sus datos de grupo). */
export function splitsDe(temporadaId: string): number[] {
  const set = new Set<number>(partidosDe(temporadaId).map((p) => p.split));
  grupos.filter((g) => g.temporada === temporadaId).forEach((g) => set.add(g.split));
  return [...set].sort((a, b) => a - b);
}

const partidosGrupo = (temporadaId: string, split: number) =>
  partidosDe(temporadaId).filter((p) => p.split === split && p.fase === 'grupos');

export type FilaClasificacion = {
  club: string; pj: number; v: number; e: number; d: number; gf: number; gc: number; dif: number; pts: number; nuestro: boolean;
};

/** Tabla del grupo de un split: nuestros partidos de grupos + los resultados de los demás equipos. */
export function clasificacion(temporadaId: string, split: number): FilaClasificacion[] {
  const filas = new Map<string, FilaClasificacion>();
  const fila = (club: string) => {
    if (!filas.has(club)) filas.set(club, { club, pj: 0, v: 0, e: 0, d: 0, gf: 0, gc: 0, dif: 0, pts: 0, nuestro: club === nombreClub });
    return filas.get(club)!;
  };
  const registrar = (a: string, ga: number, b: string, gb: number) => {
    for (const [club, f, c] of [[a, ga, gb], [b, gb, ga]] as const) {
      const x = fila(club);
      x.pj++; x.gf += f; x.gc += c;
      if (f > c) { x.v++; x.pts += PUNTOS_VICTORIA; }
      else if (f === c) { x.e++; x.pts += PUNTOS_EMPATE; }
      else x.d++;
    }
  };

  for (const p of partidosGrupo(temporadaId, split).filter(jugado)) {
    registrar(nombreClub, p.golesFavor!, p.rival, p.golesContra!);
  }
  for (const r of grupoDe(temporadaId, split)?.resultados ?? []) {
    registrar(r.local, r.golesLocal, r.visitante, r.golesVisitante);
  }

  const lista = [...filas.values()];
  lista.forEach((f) => (f.dif = f.gf - f.gc));
  lista.sort((a, b) => b.pts - a.pts || b.dif - a.dif || b.gf - a.gf || a.club.localeCompare(b.club));
  // Sin los resultados de los demás equipos la tabla no es fiable: solo mostramos nuestra fila.
  return tablaCompleta(temporadaId, split) ? lista : lista.filter((f) => f.nuestro);
}

/** ¿Tenemos los resultados de los demás equipos de este grupo? (si no, la tabla solo muestra nuestros datos) */
export const tablaCompleta = (temporadaId: string, split: number) =>
  (grupoDe(temporadaId, split)?.resultados.length ?? 0) > 0;

export type PartidoJornada = {
  local: string; visitante: string;
  golesLocal: number | null; golesVisitante: number | null; nuestro: boolean;
  idPartido?: string;                                   // solo en nuestros partidos: para enlazar a su página
  incomparecencia?: 'rival' | 'nosotros' | 'otro';       // partido dado por incomparecencia ('otro' = entre otros equipos)
  sinGoles?: boolean;                                   // nuestro partido jugado en el que no marcamos
  goleadores?: { id: string; nombre: string; goles: number }[]; // solo en nuestros partidos
  propiaRival?: number;                                  // goles nuestros en propia puerta del rival
  enPropia?: { id: string; goles: number }[];            // nuestros jugadores que marcaron en propia
};

/** Jornadas de la fase de grupos de un split, de la primera a la última. */
export function jornadas(temporadaId: string, split: number) {
  const mapa = new Map<number, PartidoJornada[]>();
  const fechas = new Map<number, string>(); // fecha de cada jornada (la más temprana de sus partidos)
  const añadir = (n: number, m: Omit<PartidoJornada, 'nuestro'>, f?: string) => {
    if (!mapa.has(n)) mapa.set(n, []);
    mapa.get(n)!.push({ ...m, nuestro: m.local === nombreClub || m.visitante === nombreClub });
    if (f && (!fechas.get(n) || f < fechas.get(n)!)) fechas.set(n, f);
  };

  for (const p of partidosGrupo(temporadaId, split).filter((p) => p.jornada)) {
    const ok = jugado(p);
    añadir(p.jornada!, {
      idPartido: p.id,
      incomparecencia: p.incomparecencia,
      sinGoles: ok && p.golesFavor === 0 && !p.incomparecencia,
      local: p.local ? nombreClub : p.rival,
      visitante: p.local ? p.rival : nombreClub,
      golesLocal: ok ? (p.local ? p.golesFavor : p.golesContra) : null,
      golesVisitante: ok ? (p.local ? p.golesContra : p.golesFavor) : null,
      goleadores: ok
        ? p.apariciones
            .filter((a) => (a.goles ?? 0) > 0)
            .sort((a, b) => b.goles! - a.goles!)
            .map((a) => ({ id: a.jugador, nombre: getJugador(a.jugador).nombre, goles: a.goles! }))
        : [],
      propiaRival: ok ? (p.propiaRival ?? 0) : 0,
      enPropia: ok ? p.apariciones.filter((a) => (a.propia ?? 0) > 0).map((a) => ({ id: a.jugador, goles: a.propia! })) : [],
    }, p.fecha);
  }
  for (const r of (grupoDe(temporadaId, split)?.resultados ?? []).filter((r) => r.jornada)) {
    añadir(r.jornada!, { local: r.local, visitante: r.visitante, golesLocal: r.golesLocal, golesVisitante: r.golesVisitante, incomparecencia: r.incomparecencia ? 'otro' : undefined }, r.fecha);
  }

  return [...mapa.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([numero, ps]) => ({ numero, fecha: fechas.get(numero), partidos: ps.sort((a, b) => Number(b.nuestro) - Number(a.nuestro)) }));
}

export type EstadoPlayoff =
  | { tipo: 'partido'; partido: Partido }   // hay partido de play-off (jugado o programado)
  | { tipo: 'clasificado'; terminado: boolean } // clasificados, aún sin partido en los datos
  | { tipo: 'no-clasificado' }
  | { tipo: 'pendiente' };                  // la fase de grupos no ha terminado

/** ¿Ha terminado la fase de grupos de ese split? Lo dice grupos.json, o se deduce si ya hay un split o una temporada posterior. */
function splitTerminado(temporadaId: string, split: number) {
  if (grupoDe(temporadaId, split)?.grupoFinalizado) return true;
  if (splitsDe(temporadaId).some((s) => s > split)) return true;
  const t = temporadas.find((x) => x.id === temporadaId);
  if (t?.splitActual && split < t.splitActual) return true;
  return temporadas.some((x) => x.id > temporadaId);
}

export function playoff(temporadaId: string, split: number): EstadoPlayoff {
  const partido = partidosDe(temporadaId).find((p) => p.split === split && p.fase === 'playoff');
  if (partido) return { tipo: 'partido', partido };

  const terminado = splitTerminado(temporadaId, split);
  const manual = grupoDe(temporadaId, split)?.clasificado; // opcional: forzar el resultado en grupos.json
  if (manual !== undefined) return manual ? { tipo: 'clasificado', terminado } : { tipo: 'no-clasificado' };

  if (!terminado) return { tipo: 'pendiente' };
  if (!tablaCompleta(temporadaId, split)) return { tipo: 'no-clasificado' }; // sin tabla completa, solo cuenta si hay partido de play-off
  const pos = clasificacion(temporadaId, split).findIndex((f) => f.nuestro) + 1;
  return pos > 0 && pos <= PLAZAS_PLAYOFF ? { tipo: 'clasificado', terminado } : { tipo: 'no-clasificado' };
}

export const portadaDe = (n: Noticia) => n.portada ?? n.fotos?.[0];
export const fotoUrl = (n: Noticia, archivo: string) => url(`/noticias/${n.id}/${archivo}`);

/** Noticias del carrusel: las marcadas como destacadas (máx. 5) o, si no hay ninguna, las 3 últimas. */
export const destacadas = (max = 5) => {
  const marcadas = noticias.filter((n) => n.destacada).slice(0, max);
  return marcadas.length ? marcadas : noticias.slice(0, 3);
};

// ---------- Capitán y subcapitanes ----------
import rawCapitanes from '../data/capitanes.json';

export type Rol = 'capitan' | 'subcapitan';
export const rolDe = (id: string): Rol | null =>
  rawCapitanes.capitan === id ? 'capitan' : rawCapitanes.subcapitanes.includes(id) ? 'subcapitan' : null;

// ---------- Ranking de cada premio ----------
const TOP_GOLEADORES = 5; // cuántos salen en el ranking del máximo goleador

/** Mejor jugador y mejor portero: ranking por `puntos` de cada nominado (si los has puesto).
 *  Máximo goleador: ranking automático por goles de esa temporada. El resto de premios no tiene ranking. */
export function rankingPremio(g: Gala, c: Categoria): { unidad: 'puntos' | 'goles'; filas: { jugador: Jugador; valor: number }[] } | null {
  if (c.id === 'maximo-goleador') {
    const filas = ranking('goles', partidosDe(g.temporada), TOP_GOLEADORES);
    return filas.length ? { unidad: 'goles', filas } : null;
  }
  if (c.id === 'mejor-jugador' || c.id === 'mejor-portero') {
    const filas = c.nominados
      .filter((n) => n.puntos !== undefined)
      .map((n) => ({ jugador: getJugador(n.jugador), valor: n.puntos! }))
      .sort((a, b) => b.valor - a.valor);
    return filas.length ? { unidad: 'puntos', filas } : null;
  }
  return null;
}

/** La temporada más reciente de temporadas.json (la que "toca ahora"). */
export const temporadaActual = () => [...temporadas].sort((a, b) => a.id.localeCompare(b.id)).pop();

/** ¿Es este jugador de apoyo en esa temporada? (lista `apoyo` de temporadas.json) */
export const esApoyo = (temporadaId: string, jugadorId: string) =>
  temporadas.find((t) => t.id === temporadaId)?.apoyo?.includes(jugadorId) ?? false;

/** Jugador que ha venido de apoyo alguna vez pero nunca ha estado en una plantilla. */
export const esSoloApoyo = (jugadorId: string) =>
  temporadas.some((t) => t.apoyo?.includes(jugadorId)) && !temporadas.some((t) => t.plantilla.includes(jugadorId));

/** Estuvo en alguna plantilla, pero ya no está en la de la temporada actual (la más reciente). */
export const esExjugador = (jugadorId: string) => {
  const actual = temporadaActual();
  return !!actual && temporadas.some((t) => t.plantilla.includes(jugadorId)) && !actual.plantilla.includes(jugadorId);
};

// ---------- Asistencias: desde cuándo se apuntan (src/data/registro.json) ----------
import rawRegistro from '../data/registro.json';

const rawReg = rawRegistro as { asistenciasDesde: string | null };
export const registro = {
  asistenciasDesde: rawReg.asistenciasDesde ? normalizarFecha(rawReg.asistenciasDesde, '"asistenciasDesde" de registro.json') : null,
};
/** ¿Se apuntaron las asistencias de este partido? (null = siempre) */
export const hayAsistencias = (p: Partido) => !registro.asistenciasDesde || p.fecha >= registro.asistenciasDesde;

/** División en la que estábamos en un split (3 = 3ª, 2 = 2ª, 1 = 1ª), según `divisiones` en temporadas.json. */
export const divisionDe = (temporadaId: string, split: number): number | undefined =>
  temporadas.find((t) => t.id === temporadaId)?.divisiones?.[String(split)];

export const textoIncomparecencia = (i?: 'rival' | 'nosotros' | 'otro') =>
  i === 'rival' ? 'Incomparecencia del rival' : i === 'nosotros' ? 'Incomparecencia nuestra' : i ? 'Incomparecencia' : '';
