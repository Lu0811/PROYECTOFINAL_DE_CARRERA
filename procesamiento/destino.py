import pandas as pd
import json
from collections import defaultdict

# Cargar los datos
df = pd.read_csv('/home/teriyaki/Documentos/pandemic/data/rodoviarios_final.csv')

# Asegurar formato de fecha mensual
df['MesViagem'] = pd.to_datetime(df['MesViagem'], dayfirst=True, errors='coerce')
df.dropna(subset=['MesViagem'], inplace=True)
df['MesViagem'] = df['MesViagem'].dt.to_period('M').astype(str)

# Crear diccionario de salida
resultado = defaultdict(dict)

# Agrupar por mes
for mes, grupo_mes in df.groupby('MesViagem'):
    # Estadísticas generales
    resultado[mes]['general_stats'] = {
        'max': int(grupo_mes['QuantidaDeBilhetes'].max()),
        'min': int(grupo_mes['QuantidaDeBilhetes'].min()),
        'medio': round(grupo_mes['QuantidaDeBilhetes'].mean(), 2)
    }

    # Agrupar por destino dentro de cada mes
    for destino, subgrupo in grupo_mes.groupby('Destino'):
        uf = subgrupo['UFDestino'].mode().iloc[0] if not subgrupo['UFDestino'].isnull().all() else None
        total_billetes = int(subgrupo['QuantidaDeBilhetes'].sum())
        resultado[mes][destino] = {
            'UFDestino': uf,
            'total_billetes': total_billetes
        }

# Guardar a JSON
with open('destino_por_mes.json', 'w', encoding='utf-8') as f:
    json.dump(resultado, f, ensure_ascii=False, indent=4)

print("✅ JSON exportado exitosamente como 'destino_por_mes.json'")
