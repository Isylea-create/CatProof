from flask import Flask, request, jsonify
from flask_cors import CORS
import language_tool_python
app = Flask(__name__)
CORS(app)

tool = language_tool_python.LanguageTool('en-US')

@app.route('/check', methods=['POST'])
def check_text():
    data = request.get_json() or {}
    text = data.get('text', '')
    char_count = len(text)
    word_count = len(text.split())

    matches = tool.check(text)
    results = []
    for match in matches:
        results.append({
            'message': match.message,
            'offset': match.offset,
            'length': match.error_length,
            'replacements': match.replacements[:3],
            'ruleID': match.rule_id
        })
    trimmed_text= text.strip()
    if trimmed_text and not trimmed_text[-1] in ['.', '!', '?']:
        results.append({
            'message': 'Sentence missing terminal punctuation (full stop).',
            'offset': len(text.rstrip()) -1,
            'length': 1,
            'replacements': [trimmed_text[-1] + '.'],
            'ruleID': 'PUNCTUATION_MISSING_END_PUNCTUATION'
        })
    return jsonify({
        'matches': results,
        'word_count': word_count,
        'char_count': char_count
                        })
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)

