from flask import Flask, render_template, jsonify
import pandas as pd
import os
from pathlib import Path
# Añadir esta nueva ruta al final de app.py
import json  # Asegúrate de tenerlo importado
app = Flask(__name__, template_folder='templates', static_folder='static')

# Configuración de rutas mejorada
BASE_DIR = Path(__file__).parent.parent
DATA_FILE = BASE_DIR / 'data' / 'rodoviarios_final.csv'

def load_data():
    """Función para cargar los datos con manejo de errores mejorado"""
    try:
        # Leer CSV con manejo de diferentes formatos
        df = pd.read_csv(DATA_FILE, on_bad_lines='skip')

        
        # Eliminar columnas completamente vacías o innecesarias
        df = df.dropna(axis=1, how='all')
        
        # Eliminar columnas de índice si existen
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
        
        return df
    except Exception as e:
        print(f"Error al cargar el archivo CSV: {str(e)}")
        return None

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/data')
def get_data():
    df = load_data()
    if df is None:
        return jsonify({'error': 'No se pudo cargar el archivo de datos'}), 500
    return jsonify(df.to_dict(orient='records'))

@app.route('/api/columns')
def get_columns():
    df = load_data()
    if df is None:
        return jsonify({'error': 'No se pudo cargar el archivo de datos'}), 500
    
    # Obtener todas las columnas excepto las de índice
    columns = [col for col in df.columns if not col.lower().startswith('unnamed')]
    return jsonify(columns)

@app.route('/api/stats/<column>')
def get_column_stats(column):
    df = load_data()
    if df is None:
        return jsonify({'error': 'No se pudo cargar el archivo de datos'}), 500
    
    try:
        if column not in df.columns:
            return jsonify({'error': f'Columna {column} no encontrada'}), 404
            
        if column in ['Coordenadas_Origem', 'Coordenadas_Destino']:
            # Procesamiento especial para coordenadas
            coord_df = df[column].str.extract(r'\(([-0-9.]+),\s*([-0-9.]+)\)')
            df['lat'] = coord_df[0].astype(float)
            df['lon'] = coord_df[1].astype(float)
            
            stats = {
                'min_lat': df['lat'].min(),
                'max_lat': df['lat'].max(),
                'min_lon': df['lon'].min(),
                'max_lon': df['lon'].max(),
                'type': 'coords'
            }
        elif pd.api.types.is_numeric_dtype(df[column]):
            stats = df[column].describe().to_dict()
            stats['type'] = 'numeric'
        else:
            # Para columnas categóricas
            counts = df[column].value_counts().head(20).to_dict()
            stats = {
                'counts': counts,
                'unique_values': len(counts),
                'type': 'categorical'
            }
        
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': f'Error al procesar columna {column}: {str(e)}'}), 500



@app.route('/api/origem-stats')
def get_origem_stats():
    try:
        file_path = BASE_DIR / 'data' / 'origem_data.json'
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': f'No se pudo cargar origem_data.json: {str(e)}'}), 500



if __name__ == '__main__':
    # Verificar que el archivo existe antes de iniciar
    if not DATA_FILE.exists():
        print(f"Error: No se encontró el archivo de datos en {DATA_FILE}")
        print("Asegúrate de que el archivo rodoviarios_final.csv está en la carpeta data/")
    else:
        print(f"Archivo de datos encontrado en {DATA_FILE}")
        app.run(debug=True)