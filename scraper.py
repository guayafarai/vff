import json
import asyncio
from base64 import b64decode
from playwright.async_api import async_playwright

_p1 = "aHR0cHM6Ly9sYTE4aGQuc3U="
_p2 = "L2V2ZW50b3MvanNvbi9hZ2VuZGExMjMuanNvbg=="
AGENDA_URL = b64decode(_p1).decode() + b64decode(_p2).decode()

async def get_real_stream(page, url):
    real_link = url
    try:
        # Interceptar solicitudes de red para cazar directamente el archivo .m3u8 que carga el reproductor
        detected_m3u8 = []
        
        def handle_request(request):
            if ".m3u8" in request.url:
                detected_m3u8.append(request.url)

        page.on("request", handle_request)
        
        # Navegar a la página del canal esperando a que carguen los scripts
        await page.goto(url, timeout=15000, wait_until="domcontentloaded")
        await asyncio.sleep(3) # Dar tiempo a que el reproductor inicie y emita peticiones m3u8
        
        if detected_m3u8:
            real_link = detected_m3u8[0]
    except Exception as e:
        print(f"[!] Error analizando {url}: {e}")
    
    return real_link

async def main():
    print(f"[*] Obteniendo agenda desde: {AGENDA_URL}")
    
    agenda_actualizada = []
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        page = await context.new_page()
        
        # Obtener la lista de eventos desde la API original
        try:
            response = await page.goto(AGENDA_URL, timeout=10000)
            content = await response.text()
            eventos_originales = json.loads(content)
        except Exception as e:
            print(f"[!] No se pudo cargar la agenda principal: {e}")
            await browser.close()
            return

        for item in eventos_originales:
            canal_url = item.get("link", "")
            link_final = canal_url
            
            if canal_url and "http" in canal_url:
                print(f"[*] Buscando stream para: {item.get('title')} ({canal_url})")
                link_final = await get_real_stream(page, canal_url)
                print(f"[✓] Encontrado: {link_final}")

            agenda_actualizada.append({
                "category": item.get("category", "futbol"),
                "link": link_final,
                "title": item.get("title", ""),
                "time": item.get("time", ""),
                "status": item.get("status", "En vivo"),
                "language": item.get("language", "Español"),
                "date": item.get("date", "")
            })

        await browser.close()

    # Guardar el JSON actualizado con los enlaces de video reales
    with open('agenda.json', 'w', encoding='utf-8') as f:
        json.dump(agenda_actualizada, f, indent=4, ensure_ascii=False)
    print("[*] Archivo agenda.json actualizado con éxito.")

if __name__ == "__main__":
    asyncio.run(main())
