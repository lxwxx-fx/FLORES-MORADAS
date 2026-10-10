// ==========================================================
// Flores Moradas — script.js
// Animaciones modernas, suaves y a 60fps (solo transform/opacity
// en CSS + canvas con rAF). Sin librerías externas.
// Incluye: pétalos, título letra a letra, reveal, tilt 3D,
// máquina de escribir, barra de progreso y confeti.
// Respeta prefers-reduced-motion.
// ==========================================================

document.addEventListener('DOMContentLoaded', () => {
  // 0. Respeto a movimiento reducido: si el usuario lo pide, no animamos.
  const reduceMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // BUGFIX: fallback si el navegador no tiene IntersectionObserver (navegadores viejos).
  // Sin esto, el reveal dejaba el contenido invisible para siempre.
  const hayIO = 'IntersectionObserver' in window;

  // Referencias principales (estructura existente intacta)
  const hero = document.querySelector('.hero');
  const barraProgreso = document.getElementById('barra-progreso');

  // ----------------------------------------------------------
  // 1. HERO: título letra por letra + entrada escalonada
  // ----------------------------------------------------------
  const titulo = document.querySelector('[data-letras]');
  if (titulo) {
    const textoOriginal = titulo.textContent;
    // Accesibilidad: el lector lee el texto completo, las letras son decorativas
    titulo.setAttribute('aria-label', textoOriginal.trim());

    if (!reduceMovimiento) {
      titulo.textContent = '';
      [...textoOriginal].forEach((caracter, i) => {
        const span = document.createElement('span');
        span.className = caracter === ' ' ? 'letra letra--espacio' : 'letra';
        span.textContent = caracter === ' ' ? '\u00A0' : caracter;
        span.setAttribute('aria-hidden', 'true');
        span.style.setProperty('--i', String(i));
        titulo.appendChild(span);
      });
    }
  }

  // Activa la transición escalonada de [data-hero] (CSS usa --d como retardo)
  if (hero) {
    if (reduceMovimiento) {
      hero.classList.add('cargado');
    } else {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => hero.classList.add('cargado'));
      });
    }
  }

  // ----------------------------------------------------------
  // 2. SCROLL SUAVE (comportamiento original, ahora con confeti)
  // ----------------------------------------------------------
  document.querySelectorAll('[data-scroll]').forEach((enlace) => {
    enlace.addEventListener('click', (evento) => {
      const idDestino = enlace.getAttribute('href');
      if (!idDestino || !idDestino.startsWith('#')) return;
      const destino = document.querySelector(idDestino);
      if (!destino) return;

      evento.preventDefault();

      // 7. Confeti morado al pulsar el botón principal
      lanzarConfetiDesde(enlace);

      destino.scrollIntoView({
        behavior: reduceMovimiento ? 'auto' : 'smooth',
        block: 'start'
      });
    });
  });

  // ----------------------------------------------------------
  // 3. BARRA DE PROGRESO DE SCROLL (fina, dorada, vía scaleX)
  // ----------------------------------------------------------
  // Usamos transform scaleX (no width) para no provocar reflows: 60fps.
  if (barraProgreso && !reduceMovimiento) {
    let progresoPendiente = false;

    const actualizarProgreso = () => {
      progresoPendiente = false;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const avance = max > 0 ? window.scrollY / max : 0;
      barraProgreso.style.transform = `scaleX(${avance})`;
    };

    window.addEventListener(
      'scroll',
      () => {
        if (!progresoPendiente) {
          progresoPendiente = true;
          requestAnimationFrame(actualizarProgreso);
        }
      },
      { passive: true }
    );
    window.addEventListener('resize', actualizarProgreso);
    actualizarProgreso();
  } else if (barraProgreso) {
    // Sin animación: ocultamos la barra (CSS también la oculta)
    barraProgreso.style.transform = 'scaleX(0)';
  }

  // ----------------------------------------------------------
  // 4. SCROLL REVEAL con IntersectionObserver (fade + slide)
  // ----------------------------------------------------------
  const objetivosReveal = document.querySelectorAll(
    '.seccion__titulo, .seccion__intro, .tarjeta, .flor, .carta, .contador__bloque, .ramo__flor, .ramo__mensaje'
  );

  if (reduceMovimiento || !hayIO) {
    // Todo visible al instante, sin observar
    objetivosReveal.forEach((el) => el.classList.add('visible'));
  } else {
    objetivosReveal.forEach((el) => {
      el.classList.add('reveal');

      // Retardo escalonado dentro de cada grupo de tarjetas
      const padre = el.parentElement;
      if (padre && (padre.classList.contains('tarjetas-3') || padre.classList.contains('galeria') || padre.classList.contains('ramo') || padre.classList.contains('contador'))) {
        const indice = [...padre.children].indexOf(el);
        el.style.setProperty('--retraso', `${(indice % 3) * 90}ms`);
      }
    });

    const observadorReveal = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((entrada) => {
          if (entrada.isIntersecting) {
            entrada.target.classList.add('visible');
            observadorReveal.unobserve(entrada.target); // solo una vez
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -8% 0px' }
    );

    objetivosReveal.forEach((el) => observadorReveal.observe(el));
  }

  // ----------------------------------------------------------
  // 5. PÉTALOS AMARILLOS en el hero (canvas, lento y ligero)
  // ----------------------------------------------------------
  const canvasPetalos = document.getElementById('petalos');
  if (canvasPetalos && !reduceMovimiento && hero) {
    const ctx = canvasPetalos.getContext('2d');
    let ancho = 0;
    let alto = 0;
    let petalos = [];
    let heroVisible = true; // el observer lo actualiza; sin IO se asume visible

    // Paleta de pétalos (morados + lavanda)
    const COLORES = ['#C4A1F0', '#7C3AED', '#D8B4FE', '#EDE9FE', '#A855F7'];
    const NUMERO = window.innerWidth < 600 ? 16 : 26; // menos en móvil

    const redimensionar = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // tope por rendimiento
      const rect = hero.getBoundingClientRect();
      ancho = rect.width;
      alto = rect.height;
      canvasPetalos.width = Math.floor(ancho * dpr);
      canvasPetalos.height = Math.floor(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const crearPetalos = () => {
      petalos = Array.from({ length: NUMERO }, () => ({
        x: Math.random() * ancho,
        y: Math.random() * alto,
        tam: 5 + Math.random() * 9, // tamaño del pétalo
        velY: 0.3 + Math.random() * 0.7, // caída lenta
        balanceo: 20 + Math.random() * 40, // amplitud lateral
        fase: Math.random() * Math.PI * 2,
        freq: 0.004 + Math.random() * 0.008,
        angulo: Math.random() * Math.PI * 2,
        velAngulo: (Math.random() - 0.5) * 0.02,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        opacidad: 0.55 + Math.random() * 0.4
      }));
    };

    const dibujarPetalos = () => {
      // El navegador pausa el rAF solo en pestañas ocultas; fuera del hero
      // saltamos el dibujo (lo caro) y solo cuesta dos booleanos por frame.
      requestAnimationFrame(dibujarPetalos);

      // Pausa si la pestaña está oculta o el hero fuera de pantalla
      if (document.hidden || !heroVisible) return;

      ctx.clearRect(0, 0, ancho, alto);
      petalos.forEach((p) => {
        p.fase += p.freq * 16;
        p.y += p.velY;
        p.x += Math.sin(p.fase) * 0.4;
        p.angulo += p.velAngulo;

        // Recicla arriba cuando sale por abajo
        if (p.y > alto + 20) {
          p.y = -20;
          p.x = Math.random() * ancho;
        }

        ctx.save();
        ctx.globalAlpha = p.opacidad;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angulo);
        ctx.fillStyle = p.color;
        // Pétalo ovalado (barato de dibujar, sin sombras)
        ctx.beginPath();
        ctx.ellipse(0, 0, p.tam * 0.55, p.tam, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });
    };

    // Solo anima cuando el hero es visible (ahorra batería).
    // Sin IO asumimos visible (heroVisible ya es true) para no romper nada.
    if (hayIO) {
      new IntersectionObserver(
        (entradas) => {
          heroVisible = entradas[0].isIntersecting;
        },
        { threshold: 0 }
      ).observe(hero);
    }

    // Debounce: evita recrear el canvas en cada tick del gesto de resize
    let resizePetalos = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizePetalos);
      resizePetalos = setTimeout(() => {
        redimensionar();
        crearPetalos();
      }, 150);
    });

    redimensionar();
    crearPetalos();
    dibujarPetalos();
  } else if (canvasPetalos) {
    // Sin animación: canvas oculto (CSS también lo oculta)
    canvasPetalos.style.display = 'none';
  }

  // ----------------------------------------------------------
  // 6. TILT 3D + elevación en tarjetas de flores (.flor)
  // ----------------------------------------------------------
  // Solo en dispositivos con puntero fino y sin reduced-motion.
  const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (punteroFino && !reduceMovimiento) {
    document.querySelectorAll('.flor').forEach((tarjeta) => {
      let raf = null;

      tarjeta.addEventListener('mousemove', (e) => {
        if (raf) return;
        raf = requestAnimationFrame(() => {
          raf = null;
          const rect = tarjeta.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5..0.5
          const py = (e.clientY - rect.top) / rect.height - 0.5;
          // Rotación ligera (máx ~8°) + elevación. Solo transform.
          tarjeta.style.transform =
            `translateY(-8px) rotateX(${(-py * 8).toFixed(2)}deg) rotateY(${(px * 8).toFixed(2)}deg)`;
        });
      });

      tarjeta.addEventListener('mouseleave', () => {
        if (raf) {
          cancelAnimationFrame(raf);
          raf = null;
        }
        tarjeta.style.transform = '';
      });
    });
  }

  // ----------------------------------------------------------
  // 7. CARTA con efecto máquina de escribir al entrar en pantalla
  // ----------------------------------------------------------
  const textoCarta = document.querySelector('[data-maquina]');
  if (textoCarta) {
    // Normalizamos espacios para un tipeo limpio
    const textoCompleto = textoCarta.textContent.replace(/\s+/g, ' ').trim();

    if (reduceMovimiento) {
      textoCarta.textContent = textoCompleto; // visible al instante
    } else if (!hayIO) {
      textoCarta.textContent = textoCompleto; // sin IO no hay trigger: mostrar directo
    } else {
      let yaEscrito = false;
      textoCarta.textContent = ''; // se rellena al entrar en pantalla

      const escribir = () => {
        if (yaEscrito) return;
        yaEscrito = true;
        textoCarta.classList.add('escribiendo');
        let i = 0;
        const VELOCIDAD = 26; // ms por carácter

        const paso = () => {
          i += 2; // 2 caracteres por tick: fluido y no eterno
          textoCarta.textContent = textoCompleto.slice(0, i);
          if (i < textoCompleto.length) {
            setTimeout(paso, VELOCIDAD);
          } else {
            textoCarta.textContent = textoCompleto;
            textoCarta.classList.remove('escribiendo');
          }
        };
        paso();
      };

      new IntersectionObserver(
        (entradas, obs) => {
          if (entradas[0].isIntersecting) {
            escribir();
            obs.disconnect();
          }
        },
        { threshold: 0.4 }
      ).observe(textoCarta);
    }
  }

  // ----------------------------------------------------------
  // 8. CONFETI MORADO al pulsar el botón principal (canvas)
  // ----------------------------------------------------------
  const canvasConfeti = document.getElementById('confeti');
  let piezas = [];
  let confetiActivo = false;

  const redimensionarConfeti = () => {
    if (!canvasConfeti) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvasConfeti.width = Math.floor(window.innerWidth * dpr);
    canvasConfeti.height = Math.floor(window.innerHeight * dpr);
    canvasConfeti.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  if (canvasConfeti) {
    redimensionarConfeti();
    // Debounce: el resize dispara decenas de eventos por gesto
    let resizeConfeti = null;
    window.addEventListener('resize', () => {
      clearTimeout(resizeConfeti);
      resizeConfeti = setTimeout(redimensionarConfeti, 150);
    });
  }

  function lanzarConfetiDesde(origen) {
    if (!canvasConfeti || reduceMovimiento) return;

    const ctx = canvasConfeti.getContext('2d');
    const rect = origen.getBoundingClientRect();
    const ox = rect.left + rect.width / 2;
    const oy = rect.top + rect.height / 2;
    const COLORES = ['#C4A1F0', '#7C3AED', '#F4EDFD', '#A8C3A0', '#FFFFFF'];

    // Explosión de ~130 piezas moradas
    for (let i = 0; i < 130; i++) {
      const ang = Math.random() * Math.PI * 2;
      const vel = 3 + Math.random() * 7;
      piezas.push({
        x: ox,
        y: oy,
        vx: Math.cos(ang) * vel,
        vy: Math.sin(ang) * vel - 4,
        tam: 4 + Math.random() * 6,
        ang: Math.random() * Math.PI,
        velAng: (Math.random() - 0.5) * 0.3,
        color: COLORES[Math.floor(Math.random() * COLORES.length)],
        vida: 90 + Math.random() * 60,
        circular: Math.random() > 0.6
      });
    }

    if (!confetiActivo) {
      confetiActivo = true;
      requestAnimationFrame(pintarConfeti.bind(null, ctx));
    }
  }

  function pintarConfeti(ctx) {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    piezas = piezas.filter((p) => p.vida > 0);
    piezas.forEach((p) => {
      p.vida -= 1;
      p.vy += 0.16; // gravedad suave
      p.vx *= 0.99; // fricción
      p.vy *= 0.995;
      p.x += p.vx;
      p.y += p.vy;
      p.ang += p.velAng;

      ctx.save();
      ctx.globalAlpha = Math.max(p.vida / 120, 0);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.ang);
      ctx.fillStyle = p.color;
      if (p.circular) {
        ctx.beginPath();
        ctx.arc(0, 0, p.tam * 0.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillRect(-p.tam / 2, -p.tam / 4, p.tam, p.tam / 2);
      }
      ctx.restore();
    });

    if (piezas.length > 0) {
      requestAnimationFrame(pintarConfeti.bind(null, ctx));
    } else {
      confetiActivo = false;
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  }

  // ----------------------------------------------------------
  // 9. PANTALLA DE CARGA breve (flor que florece)
  // ----------------------------------------------------------
  // Se oculta sola: mínimo ~700ms para apreciarla, máximo 2.5s por seguridad.
  const cargador = document.getElementById('cargador');
  if (cargador) {
    let cargadorOculto = false;
    const ocultarCargador = () => {
      if (cargadorOculto) return;
      cargadorOculto = true;
      cargador.classList.add('oculto');
      // Lo retiramos del DOM tras la transición (solo transform/opacity)
      setTimeout(() => cargador.remove(), 500);
    };

    if (reduceMovimiento) {
      ocultarCargador(); // sin espera si no hay animación
    } else {
      window.addEventListener('load', () => setTimeout(ocultarCargador, 700));
      // Failsafe por si 'load' tarda (fuentes, etc.)
      setTimeout(ocultarCargador, 2500);
    }
  }

  // ----------------------------------------------------------
  // 10. CUENTA ATRÁS hacia el 9 de octubre
  // ----------------------------------------------------------
  // Si hoy es 9 de octubre: mensaje especial en vez de números.
  const cdDias = document.getElementById('cd-dias');
  const cdHoras = document.getElementById('cd-horas');
  const cdMin = document.getElementById('cd-min');
  const cdSeg = document.getElementById('cd-seg');
  const cdCaja = document.getElementById('contador');
  const cdMensaje = document.getElementById('contador-mensaje');

  const esHoyNueveOctubre = () => {
    const h = new Date();
    return h.getMonth() === 9 && h.getDate() === 9; // mes 9 = octubre
  };

  const proximoNueveOctubre = () => {
    const ahora = new Date();
    let objetivo = new Date(ahora.getFullYear(), 9, 9, 0, 0, 0);
    // Si ya pasó el 9 de octubre de este año (día completo), apuntamos al próximo
    if (ahora > new Date(ahora.getFullYear(), 9, 9, 23, 59, 59, 999)) {
      objetivo = new Date(ahora.getFullYear() + 1, 9, 9, 0, 0, 0);
    }
    return objetivo;
  };

  const rellenar = (n) => String(n).padStart(2, '0');

  if (cdDias && cdMensaje && cdCaja) {
    const mostrarFiesta = () => {
      cdCaja.classList.add('contador--hoy');
      cdDias.textContent = '0';
      cdHoras.textContent = '0';
      cdMin.textContent = '0';
      cdSeg.textContent = '0';
      cdMensaje.textContent = '¡Hoy es tu día! 💜 Feliz 9 de octubre, que lo celebremos juntas.';
      cdMensaje.classList.add('contador__mensaje--fiesta');
    };

    if (esHoyNueveOctubre()) {
      mostrarFiesta();
    } else {
      const objetivo = proximoNueveOctubre();
      // BUGFIX: declarado ANTES del primer tick(). Antes, si hoy era 9 de octubre,
      // clearInterval(timer) tocaba la TDZ de `const` y lanzaba ReferenceError en consola.
      let timer = null;
      const tick = () => {
        // Por si la página sigue abierta hasta el día exacto
        if (esHoyNueveOctubre()) {
          mostrarFiesta();
          if (timer) clearInterval(timer);
          return;
        }
        const diff = Math.max(0, objetivo - new Date());
        const d = Math.floor(diff / 86400000);
        const h = Math.floor((diff % 86400000) / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const s = Math.floor((diff % 60000) / 1000);
        cdDias.textContent = d;
        cdHoras.textContent = rellenar(h);
        cdMin.textContent = rellenar(m);
        cdSeg.textContent = rellenar(s);
        // Texto de apoyo con la fecha exacta (evita aria-live ruidoso: el timer tiene aria-live="off")
        cdMensaje.textContent = `Faltan ${d} días para el 9 de octubre 🌷`;
      };
      tick();
      timer = setInterval(tick, 1000);
    }
  }

  // ----------------------------------------------------------
  // 11. MÚSICA AMBIENTAL opcional (WebAudio, apagada por defecto)
  // ----------------------------------------------------------
  // Sin archivos externos: pad suave generado con osciladores.
  const btnMusica = document.getElementById('btn-musica');
  const iconoMusica = document.getElementById('musica-icono');
  let audioCtx = null;
  let masterGain = null;
  let musicaSonando = false;
  let musicaTimer = null;
  let pasoMelodia = 0;
  // Progresión cálida pentatónica (Do mayor): suena bien en cualquier orden
  const NOTAS = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 392.0, 329.63];

  const crearAudio = () => {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0; // arranca en silencio, sube con fade
    // Filtro cálido para redondear el sonido
    const filtro = audioCtx.createBiquadFilter();
    filtro.type = 'lowpass';
    filtro.frequency.value = 1200;
    masterGain.connect(filtro);
    filtro.connect(audioCtx.destination);

    // Bordón grave continuo (muy bajito) para ambiente
    const dronGain = audioCtx.createGain();
    dronGain.gain.value = 0.05;
    dronGain.connect(masterGain);
    [130.81, 196.0].forEach((f) => {
      const osc = audioCtx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f;
      osc.connect(dronGain);
      osc.start();
    });
  };

  const notaSuave = (freq) => {
    if (!audioCtx || !masterGain) return;
    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    // Envolvente lenta: ataque 0.6s, caída 2s (sin clics)
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.22, t + 0.6);
    g.gain.exponentialRampToValueAtTime(0.001, t + 2.4);
    osc.connect(g);
    g.connect(masterGain);
    osc.start(t);
    osc.stop(t + 2.5);
  };

  const alternarMusica = async () => {
    if (!btnMusica) return;
    try {
      if (!audioCtx) crearAudio();
      if (audioCtx.state === 'suspended') await audioCtx.resume();

      musicaSonando = !musicaSonando;
      btnMusica.setAttribute('aria-pressed', String(musicaSonando));
      btnMusica.setAttribute(
        'aria-label',
        musicaSonando ? 'Desactivar música ambiental suave' : 'Activar música ambiental suave'
      );
      if (iconoMusica) iconoMusica.textContent = musicaSonando ? '♫' : '♪';

      if (musicaSonando) {
        // Fade de entrada del volumen general
        masterGain.gain.cancelScheduledValues(audioCtx.currentTime);
        masterGain.gain.setTargetAtTime(0.5, audioCtx.currentTime, 0.8);
        // Una nota cada 2.2s: melodía lenta y aleatoria dentro de la escala
        notaSuave(NOTAS[pasoMelodia % NOTAS.length]);
        musicaTimer = setInterval(() => {
          pasoMelodia += 1;
          // Salto suave: a veces repite, a veces avanza (más natural)
          if (Math.random() > 0.4) notaSuave(NOTAS[pasoMelodia % NOTAS.length]);
        }, 2200);
      } else {
        clearInterval(musicaTimer);
        masterGain.gain.setTargetAtTime(0, audioCtx.currentTime, 0.4);
        setTimeout(() => {
          if (!musicaSonando && audioCtx) audioCtx.suspend(); // ahorra batería
        }, 1200);
      }
    } catch (e) {
      // Si el navegador bloquea el audio, el botón queda apagado sin romper nada
      musicaSonando = false;
      btnMusica.setAttribute('aria-pressed', 'false');
    }
  };

  if (btnMusica) btnMusica.addEventListener('click', alternarMusica);

  // ----------------------------------------------------------
  // 12. CURSOR PERSONALIZADO sutil (solo escritorio)
  // ----------------------------------------------------------
  // Flor pequeña que sigue al mouse con retardo (lerp). No oculta el cursor nativo.
  const cursorFlor = document.getElementById('cursor-flor');
  const cursorPermitido =
    !reduceMovimiento &&
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (cursorFlor && cursorPermitido) {
    let tx = -100;
    let ty = -100;
    let cx = -100;
    let cy = -100;
    let visible = false;

    cursorFlor.style.display = 'block';

    window.addEventListener(
      'mousemove',
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!visible) {
          visible = true;
          cx = tx;
          cy = ty;
          cursorFlor.classList.add('activo');
        }
      },
      { passive: true }
    );

    // BUGFIX: mouseleave en documentElement (en `document` no es fiable en todos los navegadores)
    document.documentElement.addEventListener('mouseleave', () => {
      visible = false;
      cursorFlor.classList.remove('activo');
    });

    // Bucle lerp con rAF: solo transform, 60fps
    const seguir = () => {
      if (!document.hidden) {
        cx += (tx - cx) * 0.16;
        cy += (ty - cy) * 0.16;
        cursorFlor.style.transform = `translate(${cx.toFixed(1)}px, ${cy.toFixed(1)}px) translate(-50%, -12px)`;
      }
      requestAnimationFrame(seguir);
    };
    requestAnimationFrame(seguir);
  }

  // ----------------------------------------------------------
  // 13. RAMO INTERACTIVO (toca una flor → frase de amistad)
  // ----------------------------------------------------------
  // Botones nativos: funciona con dedo, mouse y teclado. Mensaje con aria-live.
  const floresRamo = document.querySelectorAll('.ramo__flor');
  const mensajeRamo = document.getElementById('ramo-mensaje');

  if (floresRamo.length && mensajeRamo) {
    floresRamo.forEach((btn) => {
      btn.addEventListener('click', () => {
        floresRamo.forEach((b) => {
          b.classList.remove('activa');
          b.setAttribute('aria-pressed', 'false');
        });
        btn.classList.add('activa');
        btn.setAttribute('aria-pressed', 'true');

        const frase = btn.getAttribute('data-frase') || 'Qué bonita es nuestra amistad. 💜';
        // Fundido rápido (solo opacity/transform vía CSS)
        mensajeRamo.classList.add('cambiando');
        setTimeout(() => {
          mensajeRamo.textContent = frase;
          mensajeRamo.classList.remove('cambiando');
        }, 180);
      });
    });
  }
});
