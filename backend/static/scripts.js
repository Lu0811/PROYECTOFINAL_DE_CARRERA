// Reemplaza todo el contenido de scripts.js con este código:

document.addEventListener('DOMContentLoaded', function() {
    // Variables globales
    let currentData = null;
    let currentColumn = null;
    let currentVisualization = null;
    let colorScale = d3.scaleOrdinal(d3.schemeTableau10);
    let origemStatsByDate = {};

    // Inicialización
    initDashboard();
    
    function initDashboard() {
        // Configurar búsqueda
        document.getElementById('column-search').addEventListener('input', filterColumns);
        
        // Botón de reinicio
        document.getElementById('reset-view').addEventListener('click', resetView);
        
        // Cargar datos iniciales
        loadColumns();
    }
    
    function filterColumns() {
        const searchTerm = document.getElementById('column-search').value.toLowerCase();
        const items = document.querySelectorAll('#column-list .list-group-item');
        
        items.forEach(item => {
            const text = item.textContent.toLowerCase();
            item.style.display = text.includes(searchTerm) ? 'flex' : 'none';
        });
    }
    
    function resetView() {
        document.getElementById('visualization').innerHTML = `
            <div class="placeholder-graphic">
                <i class="mdi mdi-chart-bubble"></i>
                <p>Interactúa con las variables para explorar los datos</p>
            </div>
        `;
        document.getElementById('chart-title').textContent = 'Seleccione una variable del panel izquierdo';
        document.getElementById('chart-description').textContent = '';
        closeDetailsPanel();
    }

    
    function loadColumns() {
        fetch('/api/columns')
            .then(response => {
                if (!response.ok) throw new Error('Error en la respuesta del servidor');
                return response.json();
            })
            .then(columns => {
                if (!Array.isArray(columns)) throw new Error('Formato de columnas inválido');

                const columnList = document.getElementById('column-list');
                columnList.innerHTML = ''; // Limpiar contenido previo

                columns.forEach(col => {
                    const button = document.createElement('button');
                    button.className = 'list-group-item list-group-item-action';
                    button.innerHTML = `<i class="mdi mdi-chart-bar"></i> ${col}`;

                    // Asignar función de renderizado según el nombre de la columna
                    if (col === 'Origem') {
                        button.addEventListener('click', renderOrigemVisualization);
                    } else {
                        button.addEventListener('click', () => loadColumnData(col));
                    }

                    columnList.appendChild(button);
                });
            })
            .catch(error => {
                console.error('Error al cargar columnas:', error);
                const columnList = document.getElementById('column-list');
                columnList.innerHTML = '<div class="alert alert-danger">Error al cargar las columnas</div>';
            });
    }

    function renderBasicChart(stats, column) {
        const container = d3.select('#visualization');
        container.html('');
        
        const width = container.node().clientWidth;
        const height = 500;
        const margin = {top: 20, right: 30, bottom: 50, left: 60};
        
        const svg = container.append('svg')
            .attr('width', width)
            .attr('height', height);
        
        // Determinar tipo de datos
        if (stats.type === 'numeric') {
            // Gráfico de barras para datos numéricos
            const data = Object.entries({
                'Mínimo': stats.min,
                'Media': stats.mean,
                'Máximo': stats.max,
                'Mediana': stats['50%']
            });
            
            const x = d3.scaleBand()
                .domain(data.map(d => d[0]))
                .range([margin.left, width - margin.right])
                .padding(0.1);
            
            const y = d3.scaleLinear()
                .domain([0, d3.max(data, d => d[1])])
                .range([height - margin.bottom, margin.top]);
            
            svg.selectAll('.bar')
                .data(data)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d[0]))
                .attr('y', d => y(d[1]))
                .attr('width', x.bandwidth())
                .attr('height', d => height - margin.bottom - y(d[1]))
                .attr('fill', (d, i) => colorScale(i));
            
            // Ejes
            svg.append('g')
                .attr('transform', `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x));
            
            svg.append('g')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));
            
            document.getElementById('chart-description').textContent = `Estadísticas numéricas para ${column}`;
            
        } else if (stats.type === 'categorical' && stats.counts) {
            // Gráfico de barras para datos categóricos (top 10)
            const topItems = Object.entries(stats.counts)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10);
            
            const x = d3.scaleBand()
                .domain(topItems.map(d => d[0]))
                .range([margin.left, width - margin.right])
                .padding(0.1);
            
            const y = d3.scaleLinear()
                .domain([0, d3.max(topItems, d => d[1])])
                .range([height - margin.bottom, margin.top]);
            
            svg.selectAll('.bar')
                .data(topItems)
                .enter()
                .append('rect')
                .attr('class', 'bar')
                .attr('x', d => x(d[0]))
                .attr('y', d => y(d[1]))
                .attr('width', x.bandwidth())
                .attr('height', d => height - margin.bottom - y(d[1]))
                .attr('fill', (d, i) => colorScale(i));
            
            // Ejes
            svg.append('g')
                .attr('transform', `translate(0,${height - margin.bottom})`)
                .call(d3.axisBottom(x))
                .selectAll('text')
                .attr('transform', 'rotate(-45)')
                .style('text-anchor', 'end');
            
            svg.append('g')
                .attr('transform', `translate(${margin.left},0)`)
                .call(d3.axisLeft(y));
            
            document.getElementById('chart-description').textContent = `Top 10 valores más frecuentes para ${column}`;
        }
    }
    
    // ==============================================
    // Visualización especial para Origen
    // ==============================================
    function renderOrigemVisualization() {
    const container = d3.select('#visualization');
    container.html('');

    const timelineContainer = d3.select('#timeline-container');
    timelineContainer.html('');

    fetch('/api/origem-stats')
        .then(res => res.json())
        .then(jsonData => {
        const fechas = Object.keys(jsonData).sort();

        const input = timelineContainer.append('input')
            .attr('type', 'range')
            .attr('min', 0)
            .attr('max', fechas.length - 1)
            .attr('value', fechas.length - 1)
            .attr('class', 'form-range w-100');

        function update(index) {
            const fechaSeleccionada = fechas[index];
            const fechasAcumuladas = fechas.slice(0, index + 1); // todas hasta la seleccionada

            const data = [];

            // Recorrer fechas reales
            fechasAcumuladas.forEach(fecha => {
            const registros = jsonData[fecha];
            const dateReal = new Date(fecha + "-01"); // ✅ cada punto tiene su fecha original

            Object.entries(registros).forEach(([municipio, valores]) => {
                if (municipio !== 'general_stats') {
                data.push({
                    municipio: municipio,
                    date: dateReal,  // ✅ distribuido en eje X
                    value: +valores.max
                });
                }
            });
            });

            // Actualizar recuadro de resumen solo con la última
            const resumen = jsonData[fechaSeleccionada].general_stats ?? {};
            d3.select('#selected-date').text(fechaSeleccionada);
            d3.select('#stat-max').text(resumen.max ?? '—');
            d3.select('#stat-min').text(resumen.min ?? '—');
            d3.select('#stat-medio').text(resumen.medio ?? '—');

            drawScatterChart(data);
        }

        input.on('input', function () {
            update(+this.value);
        });

        update(fechas.length - 1);
        })
        .catch(err => {
        console.error('Error al cargar origem_data.json:', err);
        });
    }

    function drawScatterChart(data) {
    const container = d3.select("#visualization");
    container.html('');

    const containerWidth = container.node().clientWidth || 900;
    const width = containerWidth;
    const height = 500;
    const margin = { top: 30, right: 40, bottom: 80, left: 60 };

    // Agrupar fechas: si es mayor a 2022, usar solo el año
    const formatFecha = d => {
        const year = d.date.getFullYear();
        return year > 2022 ? `${year}` : d3.timeFormat("%Y-%m")(d.date);
    };

    const fechasUnicas = Array.from(new Set(data.map(formatFecha)));

    // Escala X como puntos
    const x = d3.scalePoint()
        .domain(fechasUnicas)
        .range([margin.left, width - margin.right])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)]).nice()
        .range([height - margin.bottom, margin.top]);

    // Escala de color por municipio
    const color = d3.scaleOrdinal(d3.schemeCategory10);
    const municipios = Array.from(new Set(data.map(d => d.municipio)));
    color.domain(municipios);

    const svg = container.append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "auto");

    // Eje X
    svg.append("g")
        .attr("transform", `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickFormat(d => d))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("transform", "rotate(-45)")
        .style("font-size", () => width < 500 ? "9px" : "11px");

    // Eje Y
    svg.append("g")
        .attr("transform", `translate(${margin.left},0)`)
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", () => width < 500 ? "10px" : "12px");

    // Tooltip flotante
    const tooltip = d3.select("#tooltip");

    // Puntos
    svg.append("g")
        .attr("stroke", "#000")
        .attr("stroke-opacity", 0.2)
        .selectAll("circle")
        .data(data)
        .join("circle")
        .attr("cx", d => x(formatFecha(d)))
        .attr("cy", d => y(d.value))
        .attr("fill", d => color(d.municipio))
        .attr("r", d => {
        const year = d.date.getFullYear();
        return year > 2022 ? 2 : 4;
        })
        .on("mouseover", function (event, d) {
        tooltip.transition().duration(200).style("opacity", 1);
        tooltip.html(`
            <div class="tooltip-title">${d.municipio}</div>
            <div><strong>Fecha:</strong> ${formatFecha(d)}</div>
            <div><strong>Máximo:</strong> ${d.value}</div>
        `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function () {
        tooltip.transition().duration(300).style("opacity", 0);
        })
        .on("click", function (event, d) {
        // También puedes llenar un panel lateral si deseas
        alert(`Municipio: ${d.municipio}\nFecha: ${formatFecha(d)}\nMax: ${d.value}`);
        });
    }

    async function loadOrigemScatterData() {
        try {
            const rawData = await d3.json("static/data/origem_data.json");

            const result = [];

            Object.entries(rawData).forEach(([fechaStr, municipios]) => {
                const fecha = new Date(fechaStr + "-01"); // Convierte YYYY-MM a objeto Date

                Object.entries(municipios).forEach(([nombre, valores]) => {
                    if (nombre !== "general_stats") {
                        result.push({
                            date: fecha,
                            municipio: nombre,
                            value: valores.max
                        });
                    }
                });
            });

            return result;
        } catch (error) {
            console.error("Error cargando origem_data.json:", error);
            return [];
        }
    }

    
});