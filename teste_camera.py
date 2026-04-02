import cv2

# Carrega o classificador de rostos padrão do OpenCV
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')

# Inicia a captura da webcam (0)
cap = cv2.VideoCapture(0)

print("Pressione 'q' para sair.")

while True:
    ret, frame = cap.read()
    if not ret:
        break

    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

    # Detecta os rostos
    faces = face_cascade.detectMultiScale(gray, 1.3, 5)

    # Desenha o quadrado verde em cada rosto detectado
    for (x, y, w, h) in faces:
        cv2.rectangle(frame, (x, y), (x+w, y+h), (0, 255, 0), 2)

    # Mostra o resultado na janela
    cv2.imshow('Verifiq - POC Monitoramento', frame)

    # Para sair, pressione a tecla 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()