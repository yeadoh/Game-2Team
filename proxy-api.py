#!/usr/bin/env python3
"""
Web-EC2에서 실행할 프록시 API
Admin-EC2로 요청을 전달
파일: proxy-api.py
실행: python3 proxy-api.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

app = Flask(__name__)
CORS(app)

ADMIN_EC2_IP = '10.0.28.54'
ADMIN_API_URL = f'http://{ADMIN_EC2_IP}:5000'


@app.route('/health', methods=['GET'])
def health():
    return 'OK', 200


def build_forward_headers():
    """클라이언트 IP 전달용 헤더 생성"""
    return {
        "X-Forwarded-For": request.headers.get(
            "X-Forwarded-For",
            request.remote_addr
        )
    }


@app.route('/api/scores', methods=['GET'])
def get_scores():
    try:
        headers = build_forward_headers()
        response = requests.get(
            f'{ADMIN_API_URL}/api/scores',
            timeout=5,
            headers=headers
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scores', methods=['POST'])
def save_score():
    try:
        data = request.get_json()
        headers = build_forward_headers()
        response = requests.post(
            f'{ADMIN_API_URL}/api/scores',
            json=data,
            timeout=5,
            headers=headers
        )
        return jsonify(response.json()), response.status_code
    except requests.exceptions.RequestException as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)
