import pandas as pd
import json
from collections import Counter

# Función para obtener el valor más frecuente, menos frecuente y medio de una columna categórica
def get_categorical_stats(column):
    count = Counter(column)
    max_value = count.most_common(1)[0]
    min_value = min(count.items(), key=lambda x: x[1])
    sorted_items = sorted(count.items(), key=lambda x: x[1])
    middle_value = sorted_items[len(sorted_items) // 2]
    
    return {
        'max': max_value[0],
        'min': min_value[0],
        'medio': middle_value[0]
    }

def main():
    # Leer el archivo CSV desde la carpeta data/rodoviarios_final
    df = pd.read_csv('/home/teriyaki/Documentos/pandemic/data/rodoviarios_final.csv')

    # Limpiar las columnas categóricas: eliminar espacios extra
    for column in df.select_dtypes(include='object').columns:
        df[column] = df[column].str.strip()  # Eliminar espacios al principio y al final

    # Asegurarse de que la columna 'MesViagem' esté en formato de fecha (solo mes y año)
    df['MesViagem'] = pd.to_datetime(df['MesViagem'], format='%m/%Y')

    # Ordenar el DataFrame por la columna 'MesViagem' (de lo más antiguo a lo más reciente)
    df = df.sort_values(by='MesViagem', ascending=True)

    # Convertir las columnas de coordenadas a cadenas (tuplas como string)
    df['Coordenadas_Origem'] = df['Coordenadas_Origem'].apply(str)
    df['Coordenadas_Destino'] = df['Coordenadas_Destino'].apply(str)

    # Crear un diccionario vacío para guardar las estadísticas acumuladas por mes
    json_data = {}

    # Recorrer todas las columnas y guardar los valores acumulados
    for column in df.columns:
        if column != 'MesViagem' and column != 'Indice':  # Excluir las columnas 'MesViagem' e 'Indice'
            print(f"Procesando columna: {column}")
            if pd.api.types.is_numeric_dtype(df[column]):
                # Para columnas numéricas, guardamos los valores acumulados en un diccionario
                df[f'{column}_max_acum'] = df[column].cummax()  # Máximo acumulado
                df[f'{column}_min_acum'] = df[column].cummin()  # Mínimo acumulado
                df[f'{column}_mean_acum'] = df[column].expanding().mean()  # Media acumulada
                
                column_data = {
                    'MesViagem': df['MesViagem'].dt.strftime('%Y-%m').tolist(),  # Convertir la fecha a string
                    'max_acum': df[f'{column}_max_acum'].tolist(),
                    'min_acum': df[f'{column}_min_acum'].tolist(),
                    'mean_acum': df[f'{column}_mean_acum'].tolist()
                }
                json_data[column] = column_data
            else:
                # Si la columna es categórica, calculamos la frecuencia acumulada
                column_stats = df.groupby('MesViagem')[column].apply(lambda x: get_categorical_stats(x)).reset_index()

                # Simplificar la estructura de column_stats para acceder fácilmente a 'max', 'min' y 'medio'
                column_stats = column_stats.rename(columns={'level_1': 'statistic'})

                # Extraer las estadísticas y asegurarnos de que 'max', 'min' y 'medio' estén en el formato correcto
                column_data = {
                    'MesViagem': column_stats['MesViagem'].dt.strftime('%Y-%m').tolist(),  # Convertir la fecha a string
                    'max': column_stats[column_stats['statistic'] == 'max'][column].tolist(),
                    'min': column_stats[column_stats['statistic'] == 'min'][column].tolist(),
                    'medio': column_stats[column_stats['statistic'] == 'medio'][column].tolist()
                }

                json_data[column] = column_data

    # Guardar los datos en archivos JSON por cada columna
    for column, data in json_data.items():
        json_filename = f"{column}_acumulado.json"
        with open(json_filename, 'w') as json_file:
            json.dump(data, json_file, indent=4)

        print(f"Archivo JSON generado: {json_filename}")

if __name__ == "__main__":
    main()
