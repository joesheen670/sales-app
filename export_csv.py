# 將 data.js 轉換成 CSV 格式
import re

with open('data.js', 'r', encoding='utf-8') as f:
    content = f.read()

# 匹配每筆資料
pattern = r'\{id:\s*"([^"]+)",\s*date:\s*"([^"]+)",\s*buyer:\s*"([^"]+)",\s*shipping:\s*"([^"]+)",\s*region:\s*"([^"]+)"\}'
matches = re.findall(pattern, content)

# 寫入 CSV
with open('sales_data.csv', 'w', encoding='utf-8-sig') as f:
    f.write('id,date,buyer,shipping,region\n')
    for m in matches:
        # 處理可能的逗號
        row = [m[0], m[1], m[2], m[3].replace(',', '，'), m[4]]
        f.write(','.join(row) + '\n')

print(f'已匯出 {len(matches)} 筆資料到 sales_data.csv')
