import re
import json
import requests

# Tus fuentes o canales a extraer
CANALES = [
    {"title": "ESPN 2", "url": "https://la18hd.su/vivo/canales.php?stream=espn2"},
    {"title": "Disney+ Stream", "url": "https://la18hd.su/vivo/canales.php?stream=disney1"},
    {"title": "DSports", "url": "https://la18hd.su/vivo/canales.php?stream=dsports"}
]

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
}

agenda_actualizada = []

for canal in CANALES:
    try:
        response = requests.get(canal["url"], headers=headers, timeout=10)
        html = response.text
        
        # Buscar enlaces directos .m3u8 dentro de la página del canal
        m3u8_matches = re.findall(r'https?://[^\s\'"]+\.m3u8[^\s\'"]*', html)
        
        if m3u8_matches:
            link_directo = m3u8_matches[0]
        else:
            link_directo = canal["url"] # Respaldo si no lo encuentra al instante
            
        agenda_actualizada.append({
            "title": canal["title"],
            "link": link_directo,
            "category": "deportes"
        })
    except Exception as e:
        print(f"Error procesando {canal['title']}: {e}")

# Guarda los datos actualizados listos para la web
with open('agenda.json', 'w', encoding='utf-8') as f:
    json.dump(agenda_actualizada, f, indent=4, ensure_ascii=False)