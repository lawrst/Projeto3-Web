import cv2
import asyncio
import websockets
import json

async def avisar_dashboard():
    uri = "ws://127.0.0.1:8000/ws/chat/SISTEMA_CAMERA"
    try:
        async with websockets.connect(uri) as websocket:
            await websocket.send("INICIAR_MONITORAMENTO")
            print("Sucesso: Sinal de monitoramento enviado ao Dashboard!")
    except Exception as e:
        print(f"Erro: Nao foi possivel avisar o Dashboard (A API esta rodando?): {e}")

try:
    asyncio.run(avisar_dashboard())
except Exception:
    pass

face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
cap = cv2.VideoCapture(0)

print("Monitoramento ativo. Pressione 'q' para sair.")

while True:
    ret, frame = cap.read()
    if not ret: break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

    cv2.imshow('Verifiq - Monitoramento Local', frame)
    if cv2.waitKey(1) & 0xFF == ord('q'): break

cap.release()
cv2.destroyAllWindows()