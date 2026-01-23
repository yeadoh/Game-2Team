#!/usr/bin/env python3
"""
Admin-EC2에서 실행할 스코어 저장/조회 API (TXT 파일 버전)
파일: score-api.py
실행: python3 score-api.py
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

SCORE_FILE = '/home/ec2-user/scores.txt'

def load_scores():
    """TXT 파일에서 스코어 불러오기"""
    if not os.path.exists(SCORE_FILE):
        return []
    
    scores = []
    try:
        with open(SCORE_FILE, 'r') as f:
            for line in f:
                line = line.strip()
                if line:
                    # 형식: score|timestamp|ip
                    parts = line.split('|')
                    if len(parts) >= 2:
                        scores.append({
                            'score': int(parts[0]),
                            'timestamp': parts[1],
                            'ip': parts[2] if len(parts) > 2 else 'unknown'
                        })
    except Exception as e:
        print(f"Error loading scores: {e}")
        return []
    
    return scores

def save_score(score_data):
    """TXT 파일에 스코어 추가"""
    try:
        with open(SCORE_FILE, 'a') as f:
            line = f"{score_data['score']}|{score_data['timestamp']}|{score_data['ip']}\n"
            f.write(line)
        return True
    except Exception as e:
        print(f"Error saving score: {e}")
        return False

@app.route('/health', methods=['GET'])
def health():
    """헬스체크 엔드포인트"""
    return 'OK', 200

@app.route('/api/scores', methods=['GET'])
def get_scores():
    """전체 스코어 조회 (상위 10개)"""
    scores = load_scores()
    # 점수 높은 순으로 정렬
    scores.sort(key=lambda x: x['score'], reverse=True)
    return jsonify(scores[:10])

@app.route('/api/scores', methods=['POST'])
def add_score():
    """새 스코어 저장"""
    data = request.get_json()
    
    if not data or 'score' not in data:
        return jsonify({'error': 'Score is required'}), 400
    
    new_score = {
        'score': int(data['score']),
        'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        'ip': request.headers.get('X-Forwarded-For', request.remote_addr)
    }
    
    if save_score(new_score):
        return jsonify({'success': True, 'data': new_score}), 201
    else:
        return jsonify({'error': 'Failed to save score'}), 500

if __name__ == '__main__':
    # TXT 파일이 없으면 생성
    if not os.path.exists(SCORE_FILE):
        open(SCORE_FILE, 'w').close()
        print(f"Created score file: {SCORE_FILE}")
    
    print(f"Score API running on port 5000")
    print(f"Score file: {SCORE_FILE}")
    app.run(host='0.0.0.0', port=5000, debug=False)
