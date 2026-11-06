import re
import json
import requests
from base64 import b64decode

# Descodificar la URL de la agenda original (la misma que usa tu web)
_p1 = "aHR0cHM6Ly9sYTE4aGQuc3U="
_p2 = "L2V2ZW50b3MvanNvbi9hZ2VuZGExMjMuanNvbg=="
AGENDA_URL = b64decode(_p1).decode() + b64decode(_p2).decode()

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Referer': 'https://la18hd.su/'
}

agenda_actualizada = []

try:
    print(f"[*] Consultando agenda principal: {AGENDA_URL}")
    response = requests.get(AGENDA_URL, headers=headers, timeout=10)
    
    if response.status_code == 200:
        eventos_originales = response.json()
        
        for item in eventos_originales:
            canal_url = item.get("link", "")
            link_final = canal_url
            
            if canal_url:
                try:
                    # Consultar la página del canal individual para buscar el enlace m3u8 o stream limpio
                    sub_resp = requests.get(canal_url, headers=headers, timeout=5)
                    html = sub_resp.text
                    
                    # Buscar patrones de .m3u8
                    m3u8_matches = re.findall(r'(https?://[^\s\'"]+\.m3u8[^\s\'"]*)', html)
                    if m3u8_matches:
                        link_final = m3u8_matches[0]
                    else:
                        # Buscar si hay iframes o reproductores internos encubiertos
                        iframe_matches = re.findall(r'src=["\'](https?://[^"\']+)["\']', html)
                        for src in iframe_matches:
                            if "stream" in src or "player" in src or "embed" in src:
                                try:
                                    inner_resp = requests.get(src, headers=headers, timeout=4)
                                    inner_m3u8 = re.findall(r'(https?://[^\s\'"]+\.m3u8[^\s\'"]*)', inner_resp.text)
                                    if inner_m3u8:
                                        link_final = inner_m3u8[0]
                                        break
                                except:
                                    pass
                except Exception as ex:
                    print(f"[!] No se pudo procesar el canal {canal_url}: {ex}")

            # Guardar el evento respetando los campos originales pero con el enlace procesado
            agenda_actualizada.append({
                "category": item.get("category", "deportes"),
                "link": link_final,
                "title": item.get("title", "Evento en vivo"),
                "time": item.get("time", ""),
                "status": item.get("status", "En vivo"),
                "language": item.get("language", "Español"),
                "date": item.get("date", "")
            })
            print(f"[✓] Procesado: {item.get('title')} -> {link_final}")
            
    else:
        print("[!] Error al conectar con la agenda principal.")

except Exception as e:
    print(f"[!] Error general en el scraper: {e}")

# Guardar el resultado global en agenda.json para que lo lea tu index.html
with open('agenda.json', 'w', encoding='utf-8') as f:
    json.dump(agenda_actualizada, f, indent=4, ensure_ascii=False)

print(f"[*] Total de eventos procesados y guardados: {len(agenda_actualizada)}")
