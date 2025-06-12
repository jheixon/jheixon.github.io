let propiedades = [];
let arrendatarios = [];
let recibos = [];
let reciboActual = null;

// Función para convertir números a palabras en español
function numeroALetras(numero) {
    const unidades = ['', 'un', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
    const decenas = ['diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
    const centenas = ['ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
    
    if (numero === 0) return 'cero';
    if (numero < 10) return unidades[numero];
    if (numero < 20) return 'dieci' + unidades[numero - 10];
    if (numero < 30) return 'veinti' + unidades[numero - 20];
    if (numero < 100) {
        const unidad = numero % 10;
        const decena = Math.floor(numero / 10) - 1;
        return decenas[decena] + (unidad ? ' y ' + unidades[unidad] : '');
    }
    if (numero < 1000) {
        const centena = Math.floor(numero / 100);
        const resto = numero % 100;
        return (numero === 100 ? 'cien' : centenas[centena - 1]) + (resto ? ' ' + numeroALetras(resto) : '');
    }
    if (numero < 1000000) {
        const miles = Math.floor(numero / 1000);
        const resto = numero % 1000;
        return (miles === 1 ? 'mil' : numeroALetras(miles) + ' mil') + (resto ? ' ' + numeroALetras(resto) : '');
    }
    // Puedes continuar para números más grandes si es necesario
}

// Función para formatear fechas
function formatearFecha(fecha) {
    const fechaAjustada = new Date(fecha);
    fechaAjustada.setMinutes(fechaAjustada.getMinutes() + fechaAjustada.getTimezoneOffset());
    
    const opciones = { year: 'numeric', month: 'long', day: 'numeric' };
    return fechaAjustada.toLocaleDateString('es-ES', opciones);
}

// Función para cargar datos desde localStorage o desde archivos JSON
function cargarDatos() {
    console.log('Iniciando carga de datos...');
    propiedades = JSON.parse(localStorage.getItem('propiedades')) || [];
    arrendatarios = JSON.parse(localStorage.getItem('arrendatarios')) || [];
    recibos = JSON.parse(localStorage.getItem('recibos')) || [];

    const promesas = [];

    if (propiedades.length === 0) {
        promesas.push(
            fetch('propiedades.json')
                .then(response => response.json())
                .then(data => {
                    propiedades = data;
                    localStorage.setItem('propiedades', JSON.stringify(propiedades));
                    console.log('Propiedades cargadas:', propiedades);
                })
                .catch(error => console.error('Error al cargar propiedades:', error))
        );
    }

    if (arrendatarios.length === 0) {
        promesas.push(
            fetch('arrendatarios.json')
                .then(response => response.json())
                .then(data => {
                    arrendatarios = data;
                    localStorage.setItem('arrendatarios', JSON.stringify(arrendatarios));
                    console.log('Arrendatarios cargados:', arrendatarios);
                })
                .catch(error => console.error('Error al cargar arrendatarios:', error))
        );
    }

    if (recibos.length === 0) {
        promesas.push(
            fetch('recibos.json')
                .then(response => response.json())
                .then(data => {
                    recibos = data;
                    localStorage.setItem('recibos', JSON.stringify(recibos));
                    console.log('Recibos cargados:', recibos);
                })
                .catch(error => console.error('Error al cargar recibos:', error))
        );
    }

    Promise.all(promesas).then(() => {
        console.log('Todos los datos cargados. Iniciando carga de UI...');
        verificarIntegridadDatos();
        cargarPropiedades();
        cargarArrendatarios();
        cargarRecibos();
    }).catch(error => console.error('Error durante la carga de datos:', error));
}

function verificarIntegridadDatos() {
    recibos.forEach(recibo => {
        if (!recibo.direccionInmueble) {
            const propiedad = propiedades.find(p => p.codigo === recibo.numeroRecibo.substring(0, 4));
            if (propiedad) {
                recibo.direccionInmueble = propiedad.direccion;
                console.log(`Corregida dirección para recibo ${recibo.numeroRecibo}`);
            } else {
                console.error(`No se pudo encontrar la dirección para el recibo ${recibo.numeroRecibo}`);
            }
        }
    });
    guardarRecibos();
}

function cargarPropiedades() {
    const select = document.getElementById('seleccionPropiedad');
    select.innerHTML = '<option value="">Seleccione una propiedad</option>';
    propiedades.forEach(propiedad => {
        const option = document.createElement('option');
        option.value = propiedad.codigo;
        option.textContent = propiedad.direccion;
        select.appendChild(option);
    });
    
    // Añadir evento para cargar arrendatario y monto automáticamente
    select.addEventListener('change', cargarUltimoArrendatarioYMonto);
}

function cargarArrendatarios() {
    const select = document.getElementById('seleccionArrendatario');
    select.innerHTML = '<option value="">Seleccione un arrendatario</option>';
    arrendatarios.forEach(arrendatario => {
        const option = document.createElement('option');
        option.value = arrendatario.id;
        option.textContent = arrendatario.nombre;
        select.appendChild(option);
    });
}

function cargarRecibos() {
    const listaRecibos = document.getElementById('listaRecibos');
    listaRecibos.innerHTML = '';

    if (recibos.length === 0) {
        listaRecibos.innerHTML = '<p>No hay recibos para mostrar.</p>';
        return;
    }

    // Agrupar recibos por dirección de inmueble
    const recibosPorInmueble = recibos.reduce((acc, recibo) => {
        const direccion = recibo.direccionInmueble;
        if (!acc[direccion]) {
            acc[direccion] = [];
        }
        acc[direccion].push(recibo);
        return acc;
    }, {});

    // Mostrar el último recibo por inmueble
    Object.keys(recibosPorInmueble).forEach(direccion => {
        const propiedadRecibos = recibosPorInmueble[direccion];
        propiedadRecibos.sort((a, b) => new Date(b.fechaPago) - new Date(a.fechaPago));

        const seccionInmueble = document.createElement('div');
        seccionInmueble.classList.add('seccion-inmueble');
        seccionInmueble.innerHTML = `<h3>${direccion}</h3>`;

        // Mostrar el último recibo
        const ultimoRecibo = propiedadRecibos[0];
        const elementoRecibo = crearElementoRecibo(ultimoRecibo);
        seccionInmueble.appendChild(elementoRecibo);

        // Agregar botón "Ver más" si hay más de un recibo
        if (propiedadRecibos.length > 1) {
            const botonVerMas = document.createElement('button');
            botonVerMas.textContent = 'Ver más';
            botonVerMas.classList.add('boton-ver-mas');
            botonVerMas.addEventListener('click', () => mostrarTodosLosRecibos(direccion, propiedadRecibos, seccionInmueble));
            seccionInmueble.appendChild(botonVerMas);
        }

        listaRecibos.appendChild(seccionInmueble);
    });
}

function mostrarTodosLosRecibos(direccion, propiedadRecibos, seccionInmueble) {
    // Eliminar los recibos existentes y el botón "Ver más"
    while (seccionInmueble.children.length > 1) {
        seccionInmueble.removeChild(seccionInmueble.lastChild);
    }

    // Mostrar todos los recibos
    propiedadRecibos.forEach(recibo => {
        const elementoRecibo = crearElementoRecibo(recibo);
        seccionInmueble.appendChild(elementoRecibo);
    });

    // Agregar un botón "Ver menos"
    const botonVerMenos = document.createElement('button');
    botonVerMenos.textContent = 'Ver menos';
    botonVerMenos.classList.add('boton-ver-menos');
    botonVerMenos.addEventListener('click', () => cargarRecibos());
    seccionInmueble.appendChild(botonVerMenos);
}

function crearElementoRecibo(recibo) {
    const elementoRecibo = document.createElement('div');
    elementoRecibo.classList.add('recibo');
    elementoRecibo.innerHTML = `
        <strong>Número de Recibo:</strong> ${recibo.numeroRecibo}<br>
        <strong>Arrendatario:</strong> ${recibo.nombreArrendatario}<br>
        <strong>Monto:</strong> $${parseInt(recibo.montoPagado).toLocaleString('es-CO')} (${recibo.montoEnLetras})<br>
        <strong>Fecha de Pago:</strong> ${formatearFecha(recibo.fechaPago)} ${recibo.horaPago}<br>
        <strong>Período:</strong> ${formatearFecha(recibo.periodoInicio)} a ${formatearFecha(recibo.periodoFin)}<br>
        <strong>Dirección:</strong> ${recibo.direccionInmueble}<br>
    `;
    elementoRecibo.addEventListener('click', function() {
        reciboActual = recibo;
        mostrarReciboGenerado(recibo);
        cambiarSeccion('seccionRecibo');
    });
    return elementoRecibo;
}





function cargarUltimoArrendatarioYMonto() {
    const codigoPropiedad = document.getElementById('seleccionPropiedad').value;
    
    // Filtrar recibos por la propiedad seleccionada
    const recibosPropiedad = recibos.filter(r => r.numeroRecibo.startsWith(codigoPropiedad));
    
    if (recibosPropiedad.length > 0) {
        // Obtener el último recibo de la propiedad
        const ultimoRecibo = recibosPropiedad[recibosPropiedad.length - 1];
        
        // Cargar datos del último arrendatario
        const arrendatario = arrendatarios.find(a => a.nombre === ultimoRecibo.nombreArrendatario);
        if (arrendatario) {
            document.getElementById('seleccionArrendatario').value = arrendatario.id;
        }
        
        // Cargar el monto del último recibo
        document.getElementById('monto').value = ultimoRecibo.montoPagado;
        
        // Calcular la nueva fecha de inicio (1 día después de la fecha de fin del último recibo)
        const fechaFinAnterior = new Date(ultimoRecibo.periodoFin);
        const nuevaFechaInicio = new Date(fechaFinAnterior);
        nuevaFechaInicio.setDate(fechaFinAnterior.getDate() + 1);
        
        // Calcular la nueva fecha de fin
        const nuevaFechaFin = new Date(nuevaFechaInicio);
        nuevaFechaFin.setMonth(nuevaFechaFin.getMonth() + 1);
        nuevaFechaFin.setDate(nuevaFechaFin.getDate() - 1);
        
        // Establecer las nuevas fechas en el formulario
        document.getElementById('fechaInicio').value = nuevaFechaInicio.toISOString().split('T')[0];
        document.getElementById('fechaFin').value = nuevaFechaFin.toISOString().split('T')[0];
    } else {
        // No hay recibos previos para esta propiedad
        document.getElementById('seleccionArrendatario').value = '';
        document.getElementById('monto').value = '';
        document.getElementById('fechaInicio').value = '';
        document.getElementById('fechaFin').value = '';
    }
}








function obtenerSiguienteNumeroRecibo(direccionInmueble) {
    const recibosPropiedad = recibos.filter(r => r.direccionInmueble === direccionInmueble);
    if (recibosPropiedad.length > 0) {
        const ultimoRecibo = recibosPropiedad[recibosPropiedad.length - 1];
        const codigoPropiedad = ultimoRecibo.numeroRecibo.substring(0, 4);
        const ultimoNumero = parseInt(ultimoRecibo.numeroRecibo.slice(-3));
        return `${codigoPropiedad}2025${String(ultimoNumero + 1).padStart(3, '0')}`;
    } else {
        const propiedad = propiedades.find(p => p.direccion === direccionInmueble);
        return propiedad ? `${propiedad.codigo}2025001` : 'XXXX2025001';
    }
}

document.getElementById('formularioRecibo').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const propiedad = propiedades.find(p => p.codigo === document.getElementById('seleccionPropiedad').value);
    const arrendatario = arrendatarios.find(a => a.id === parseInt(document.getElementById('seleccionArrendatario').value));
    const monto = document.getElementById('monto').value;
    const montoEnLetras = numeroALetras(parseInt(monto)) + ' pesos M/CTE';
    const formaPago = document.getElementById('formaPago').value;
    const fechaPago = document.getElementById('fechaPago').value;
    const horaPago = document.getElementById('horaPago').value;
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;

    const fechaExpedicion = formatearFecha(new Date());
    const numeroRecibo = reciboActual ? reciboActual.numeroRecibo : obtenerSiguienteNumeroRecibo(propiedad.direccion);

    const recibo = {
        numeroRecibo: numeroRecibo,
        lugarExpedicion: "Bogotá D.C.",
        fechaExpedicion: fechaExpedicion,
        nombreArrendatario: arrendatario.nombre,
        documentoArrendatario: arrendatario.documento,
        telefonoArrendatario: arrendatario.telefono,
        emailArrendatario: arrendatario.email,
        montoPagado: monto,
        montoEnLetras: montoEnLetras,
        formaPago: formaPago,
        fechaPago: fechaPago,
        horaPago: horaPago,
        concepto: "Canon de arrendamiento",
        direccionInmueble: propiedad.direccion,
        parteArrendada: propiedad.parteArrendada,
        periodoInicio: fechaInicio,
        periodoFin: fechaFin,
        nombreQuienRecibe: "Manuel Antonio Arias Guerra",
        cedulaQuienRecibe: "1.057.736.060"
    };

    if (reciboActual) {
        // Estamos editando un recibo existente
        const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
        if (index > -1) {
            recibos[index] = recibo;
        }
    } else {
        // Estamos creando un nuevo recibo
        recibos.push(recibo);
    }

    reciboActual = recibo;
    mostrarReciboGenerado(recibo);
    guardarRecibos();
    cargarRecibos();
    cambiarSeccion('seccionRecibo');
});

function mostrarReciboGenerado(recibo) {
    const reciboGenerado = document.getElementById('reciboGenerado');
    reciboGenerado.innerHTML = generarHTMLRecibo(recibo);
}





function generarHTMLRecibo(recibo) {
    return `
        <div class="recibo-contenedor">
            <div class="recibo-header">
                <div>
                    <h2>Recibo de Arrendamiento</h2>
                    <p class="recibo-numero">No. ${recibo.numeroRecibo}</p>
                </div>
                <div>
                    <p><strong>Lugar y Fecha:</strong><br>${recibo.lugarExpedicion},<br>${recibo.fechaExpedicion}</p>
                </div>
            </div>
            <div class="recibo-body">
                <div>
                    <p><strong>Recibí de:</strong> ${recibo.nombreArrendatario}</p>
                    <p><strong>La suma de:</strong> $${parseInt(recibo.montoPagado).toLocaleString('es-CO')}<br>
                    <strong>En letras:</strong> ${recibo.montoEnLetras}</p>
                    <p><strong>Forma de pago:</strong> ${recibo.formaPago}<br>
                    <strong>Fecha y hora del pago:</strong> ${formatearFecha(recibo.fechaPago)}, ${recibo.horaPago}</p>
                    <p style="text-align: justify;"><strong>Por concepto de:</strong> Canon de arrendamiento del inmueble ubicado en ${recibo.direccionInmueble}, correspondiente al periodo del ${formatearFecha(recibo.periodoInicio)} al ${formatearFecha(recibo.periodoFin)}.</p>
                    <p><strong>Descripción del inmueble arrendado:</strong> ${recibo.parteArrendada}</p>
                </div>
                <div>
                    <p><strong>Observaciones:</strong></p>
                    <ul>
                        <li>Este recibo no implica novación de la deuda.</li>
                        <li>El arrendatario declara estar al día en el pago de servicios públicos y cuotas de administración (si aplica).</li>
                        <li>Este recibo no sustituye el contrato de arrendamiento vigente entre las partes.</li>
                    </ul>
                </div>
            </div>
            <div class="recibo-footer">
                <div class="firma" style="text-align: left;">
                    <p><strong>Nombre y firma de quien recibe:</strong></p>
                    <br><br>
                    <p>Original firmado<br>${recibo.nombreQuienRecibe}<br>
                    Número de cédula de ciudadanía: ${recibo.cedulaQuienRecibe}</p>
                </div>
            </div>
        </div>
    `;
}








function cargarDatosParaEdicion(recibo) {
    document.getElementById('seleccionPropiedad').value = recibo.numeroRecibo.substring(0, 4);
    document.getElementById('seleccionArrendatario').value = arrendatarios.find(a => a.nombre === recibo.nombreArrendatario).id;
    document.getElementById('monto').value = recibo.montoPagado;
    document.getElementById('formaPago').value = recibo.formaPago;
    document.getElementById('fechaPago').value = recibo.fechaPago;
    document.getElementById('horaPago').value = recibo.horaPago;
    document.getElementById('fechaInicio').value = recibo.periodoInicio;
    document.getElementById('fechaFin').value = recibo.periodoFin;
}

function guardarRecibos() {
    localStorage.setItem('recibos', JSON.stringify(recibos));
}

document.getElementById('botonImprimir').addEventListener('click', function() {
    window.print();
});

document.getElementById('botonEditar').addEventListener('click', function() {
    if (reciboActual) {
        cargarDatosParaEdicion(reciboActual);
        cambiarSeccion('seccionFormulario');
    }
});

document.getElementById('botonEliminar').addEventListener('click', function() {
    if (reciboActual && confirm('¿Está seguro de que desea eliminar este recibo? Esta acción no se puede deshacer.')) {
        const index = recibos.findIndex(r => r.numeroRecibo === reciboActual.numeroRecibo);
        if (index > -1) {
            recibos.splice(index, 1);
            guardarRecibos();
            cargarRecibos();
            reciboActual = null;
            cambiarSeccion('seccionHistorial');
        }
    }
});

document.getElementById('botonNuevoRecibo').addEventListener('click', function() {
    reciboActual = null;
    document.getElementById('formularioRecibo').reset();
    cambiarSeccion('seccionFormulario');
});

document.getElementById('botonExportar').addEventListener('click', function() {
    const datosJSON = JSON.stringify(recibos, null, 2);
    const blob = new Blob([datosJSON], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = 'recibos_alquiler.json';
    document.body.appendChild(enlace);
    enlace.click();
    
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
});

function cambiarSeccion(seccionId) {
    document.getElementById('seccionFormulario').style.display = 'none';
    document.getElementById('seccionRecibo').style.display = 'none';
    document.getElementById('seccionHistorial').style.display = 'none';
    document.getElementById(seccionId).style.display = 'block';
}

document.getElementById('navFormulario').addEventListener('click', function(e) {
    e.preventDefault();
    cambiarSeccion('seccionFormulario');
});

document.getElementById('navRecibo').addEventListener('click', function(e) {
    e.preventDefault();
    if (reciboActual) {
        cambiarSeccion('seccionRecibo');
    } else {
        alert('No hay un recibo generado para mostrar.');
    }
});

document.getElementById('navHistorial').addEventListener('click', function(e) {
    e.preventDefault();
    cargarRecibos();
    cambiarSeccion('seccionHistorial');
});

// Inicializar la aplicación
function inicializarApp() {
    console.log('Inicializando aplicación...');
    cargarDatos();
    cambiarSeccion('seccionFormulario');
    console.log('Aplicación inicializada.');
}

// Cargar datos al iniciar la aplicación
window.addEventListener('load', inicializarApp);
