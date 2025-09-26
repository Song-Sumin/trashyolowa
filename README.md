#How to run

# 1. 명령 프롬프트(CMD)를 엽니다.

# 2. main.py 파일이 있는 프로젝트 경로로 이동합니다.
#    (경로는 사용자 환경에 맞게 수정하세요)
cd C:\Users\CoIn244\Desktop\YOLO_Web_App\YOLO_Web_project

# 3. 가상 환경(venv)을 설정합니다.
python -m venv venv

# 4. 가상 환경을 활성화합니다.
.\venv\Scripts\activate

# 5. 필요한 모든 Python 라이브러리를 설치합니다.
pip install fastapi uvicorn[standard] ultralytics Pillow jinja2 python-multipart

# 6. Uvicorn을 이용해 웹 서버를 실행합니다.
#    (main.py 파일의 'app' 인스턴스를 구동)
uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# 서버가 성공적으로 실행되면 터미널에 주소가 표시됩니다 
http://127.0.0.1:8000 로 접속을 시도해보세요.
