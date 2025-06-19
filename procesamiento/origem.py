import pandas as pd
import json

# Leer y preparar los datos
df = pd.read_csv('/home/teriyaki/Documentos/pandemic/data/rodoviarios_final.csv')
df['MesViagem'] = pd.to_datetime(df['MesViagem'], format='%m/%Y')
df = df.sort_values('MesViagem')

# Agrupar por mes
# Agrupar por mes corregido
meses = sorted(df['MesViagem'].dt.to_period('M').unique())

# Diccionario final
resultado_json = {}

for mes in meses:
    mes_str = str(mes)
    df_mes = df[df['MesViagem'].dt.to_period('M') == mes]

    # Contar todos los valores de Origem
    conteo_total = df_mes['Origem'].value_counts()

    # Calcular estadísticas generales
    valores = conteo_total.values
    general_stats = {
        'max': int(valores.max()),
        'min': int(valores.min()),
        'medio': int(valores.mean())
    }

    resultado_json[mes_str] = {'general_stats': general_stats}

    # Para cada municipio, calcular sus propias estadísticas acumuladas
    for municipio in conteo_total.index:
        valores_municipio = df_mes[df_mes['Origem'] == municipio].groupby('MesViagem').size()
        count = valores_municipio.sum()

        resultado_json[mes_str][municipio] = {
            'max': int(valores_municipio.max()),
            'min': int(valores_municipio.min()),
            'medio': int(valores_municipio.mean())
        }

# Guardar JSON
with open('origem_avanzado.json', 'w', encoding='utf-8') as f:
    json.dump(resultado_json, f, ensure_ascii=False, indent=4)

print("✅ JSON avanzado generado: origem_avanzado.json")
