import json
import asyncio
import re
from base64 import b64decode
from playwright.async_api import async_playwright

# Decodificar el endpoint de la agenda original (mantiene la misma fuente de datos)
_p1 = "aHR0cHM6Ly9sYTE4aGQuc3U="
_p2 = "L2V2ZW50b3MvanNvbi9hZ2VuZGExMjMuanNvbg=="
AGENDA_URL = b64decode(_p1).decode() + b64decode(_p2).decode()

async def get_real_stream(page, url):
    """
    Navega a la página del canal usando un navegador headless y captura
    al vuelo la petición de red que contenga el archivo .m3u8 real.
    """
    real_link = url
    detected_m3u8 = []
    
    def handle_request(request):
        if ".m3u8" in request.url:
            detected_m3u8.append(request.url)

    # Escuchar las peticiones de red del navegador
    page.on("request", handle_request)
    
    try:
        # Cargar la página del canal permitiendo la ejecución de JS
        await page.goto(url, timeout=15000, wait_until="domcontentloaded")
        await asyncio.sleep(3.5) # Esperar a que el reproductor interno solicite el stream
        
        if detected_m3u8:
            real_link = detected_m3u8[0]
            print(f"   [ÉXITO] .m3u8 capturado: {real_link}")
        else:
            print(f"   [AVISO] No se detectó .m3u8 directo, manteniendo respaldo.")
    except Exception as e:
        print(f"   [ERROR] Falló al procesar {url}: {e}")
        
    # Remover el listener para evitar duplicidad en la siguiente iteración
    page.remove_listener("request", handle_request)
    return real_link

async def main():
    print(f"[*] Conectando a la agenda principal: {AGENDA_URL}")
    agenda_actualizada = []
    
    async with async_playwright() as p:
        # Iniciar navegador en segundo plano (headless)
        browser = await p.chromium.launch(
            headless=True,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        context = await browser.new_context(
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            referer="https://la18hd.su/"
        )
        page = await context.new_page()
        
        # Obtener la agenda completa en formato JSON
        try:
            response = await page.goto(AGENDA_URL, timeout=15000)
            content = await response.text()
            eventos_originales = json.loads(content)
            print(f"[*] Se encontraron {len(eventos_originales)} eventos en la agenda.")
        except Exception as e:
            print(f"[!] Error crítico al descargar la agenda principal: {e}")
            await browser.close()
            return

        # Recorrer CADA UNO de los canales/eventos detectados en la agenda
        for item in eventos_originales:
            title = item.get("title", "Evento en vivo")
            canal_url = item.get("link", "")
            link_final = canal_url
            
            print(f"\n[Procesando] {title}")
            if canal_url and canal_url.startswith("http"):
                link_final = await get_real_stream(page, canal_url)
            else:
                print(f"   [INFO] Enlace inválido o vacío.")

            # Construir el objeto manteniendo todas las propiedades originales de la agenda
            agenda_actualizada.append({
                "category": item.get("category", "deportes"),
                "link": link_final,
                "title": title,
                "time": item.get("time", ""),
                "status": item.get("status", "En vivo"),
                "language": item.get("language", "Español"),
                "date": item.get("date", "")
            })

        await browser.close()

    # Guardar todos los canales procesados en agenda.json
    with open('agenda.json', 'w', encoding='utf-8') as f:
        json.dump(agenda_actualizada, f, indent=4, ensure_ascii=False)
        
    print(f"\n[✔] Proceso finalizado. Total de eventos guardados en agenda.json: {len(agenda_actualizada)}")

if __name__ == "__main__":
    asyncio.run(main())
