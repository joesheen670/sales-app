// ============================================================
//  Sales App — Google Apps Script 後端 v2
//  支援：舊版 add/delete + 新版 addV2/updateShipV2/updateStageV2/updateFinance
//  最後更新：2025
//
//  部署方式：
//  1. 複製全部程式碼
//  2. 到 script.google.com 貼上並儲存
//  3. 部署 → 管理部署 → 建立新版本 → Web App
//     執行身分：本人，存取權：所有人
//  4. 複製新的 Web App URL 到 index.html、v2/index.html 的 API_URL
// ============================================================

// ── ★ 必填：你的 Google Sheets ID ─────────────────────────
// 從試算表網址複製：
// https://docs.google.com/spreadsheets/d/【這裡】/edit
var SPREADSHEET_ID  = "YOUR_SPREADSHEET_ID_HERE";

// ── 工作表名稱設定 ─────────────────────────────────────────
var SHEET_ORDERS    = "sales_data"; // 原始舊版訂單
var SHEET_V2_ORDERS = "V2訂單";    // 新版訂單
var SHEET_FINANCE   = "財務";      // 財務成本資料

// ── GET：回傳資料給前端 ─────────────────────────────────────
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getAll";

  try {
    var result;
    if (action === "getV2")      result = getV2Orders();
    else if (action === "getFinance") result = getFinanceData();
    else                         result = getOrders();

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", data: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ── POST：接受前端操作 ──────────────────────────────────────
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var action = body.action;
    var result;

    if      (action === "add")             result = addOrder(body);
    else if (action === "delete")          result = deleteOrder(body);
    else if (action === "addV2")           result = addV2Order(body);
    else if (action === "updateShipV2")    result = updateShipV2(body);
    else if (action === "updateStageV2")   result = updateStageV2(body);
    else if (action === "updateFinance")   result = updateFinance(body);
    else throw new Error("未知 action: " + action);

    return ContentService
      .createTextOutput(JSON.stringify({ status: "ok", result: result }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ status: "error", message: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
//  舊版訂單 (工作表: 訂單)
//  欄位順序：id | date | buyer | shipping | region | full_address
// ============================================================

function getOrders() {
  var sheet = getOrCreateSheet(SHEET_ORDERS, ["id","date","buyer","shipping","region","full_address"]);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];   // 只有標題行

  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function addOrder(body) {
  var sheet = getOrCreateSheet(SHEET_ORDERS, ["id","date","buyer","shipping","region","full_address"]);
  var id = body.id || String(Date.now());
  sheet.appendRow([id, body.date, body.buyer, body.shipping, body.region, body.full_address || ""]);
  return { id: id };
}

function deleteOrder(body) {
  var sheet = getOrCreateSheet(SHEET_ORDERS, ["id","date","buyer","shipping","region","full_address"]);
  var rows  = sheet.getDataRange().getValues();
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      sheet.deleteRow(i + 1);
      return { deleted: body.id };
    }
  }
  return { deleted: null, message: "找不到 id: " + body.id };
}

// ============================================================
//  新版訂單 v2 (工作表: V2訂單)
//  欄位：id | buyer | product | date | sale | costCny | costTwd
//        | shippingCost | shippingType | store | address | receiver
//        | phone | shipNote | note | stage
//        | createdAt | paidAt | shippedAt | doneAt
// ============================================================

var V2_HEADERS = [
  "id","buyer","product","date","sale","costCny","costTwd",
  "shippingCost","shippingType","store","address","receiver",
  "phone","shipNote","note","stage",
  "createdAt","paidAt","shippedAt","doneAt"
];

function getV2Orders() {
  var sheet = getOrCreateSheet(SHEET_V2_ORDERS, V2_HEADERS);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function addV2Order(body) {
  var sheet = getOrCreateSheet(SHEET_V2_ORDERS, V2_HEADERS);
  var id    = body.id || String(Date.now());
  sheet.appendRow([
    id,
    body.buyer         || "",
    body.product       || "",
    body.date          || "",
    body.sale          || 0,
    body.costCny       || 0,
    body.costTwd       || 0,
    body.shippingCost  || 0,
    body.shippingType  || "",
    body.store         || "",
    body.address       || "",
    body.receiver      || "",
    body.phone         || "",
    body.shipNote      || "",
    body.note          || "",
    body.stage         || "new",
    body.createdAt     || new Date().toISOString(),
    body.paidAt        || "",
    body.shippedAt     || "",
    body.doneAt        || ""
  ]);
  return { id: id };
}

function updateShipV2(body) {
  var sheet   = getOrCreateSheet(SHEET_V2_ORDERS, V2_HEADERS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows    = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      var rowNum = i + 1;
      // 更新各出貨欄位
      _setColValue(sheet, headers, rowNum, "shippingType",  body.shippingType);
      _setColValue(sheet, headers, rowNum, "store",         body.store);
      _setColValue(sheet, headers, rowNum, "address",       body.address);
      _setColValue(sheet, headers, rowNum, "receiver",      body.receiver);
      _setColValue(sheet, headers, rowNum, "phone",         body.phone);
      _setColValue(sheet, headers, rowNum, "shipNote",      body.shipNote);
      _setColValue(sheet, headers, rowNum, "shippingCost",  body.shippingCost);
      _setColValue(sheet, headers, rowNum, "stage",         body.stage || "ship");
      _setColValue(sheet, headers, rowNum, "shippedAt",     body.shippedAt || new Date().toISOString());
      return { updated: body.id };
    }
  }
  return { updated: null, message: "找不到 id: " + body.id };
}

function updateStageV2(body) {
  var sheet   = getOrCreateSheet(SHEET_V2_ORDERS, V2_HEADERS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows    = sheet.getDataRange().getValues();

  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      var rowNum = i + 1;
      _setColValue(sheet, headers, rowNum, "stage", body.stage);
      if (body.stage === "paid")  _setColValue(sheet, headers, rowNum, "paidAt",   body.paidAt  || new Date().toISOString());
      if (body.stage === "done")  _setColValue(sheet, headers, rowNum, "doneAt",   body.doneAt  || new Date().toISOString());
      return { updated: body.id, stage: body.stage };
    }
  }
  return { updated: null, message: "找不到 id: " + body.id };
}

// ============================================================
//  財務資料 (工作表: 財務)
//  欄位：id | sale | cost_cny | cost_twd | shipping_cost | profit | exchange_rate | updatedAt
// ============================================================

var FINANCE_HEADERS = [
  "id","sale","cost_cny","cost_twd","shipping_cost","profit","exchange_rate","updatedAt"
];

function getFinanceData() {
  var sheet = getOrCreateSheet(SHEET_FINANCE, FINANCE_HEADERS);
  var data  = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = row[i]; });
    return obj;
  });
}

function updateFinance(body) {
  var sheet   = getOrCreateSheet(SHEET_FINANCE, FINANCE_HEADERS);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  var rows    = sheet.getDataRange().getValues();

  // 尋找既有列
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      var rowNum = i + 1;
      _setColValue(sheet, headers, rowNum, "sale",          body.sale);
      _setColValue(sheet, headers, rowNum, "cost_cny",      body.cost_cny);
      _setColValue(sheet, headers, rowNum, "cost_twd",      body.cost_twd);
      _setColValue(sheet, headers, rowNum, "shipping_cost", body.shipping_cost);
      _setColValue(sheet, headers, rowNum, "profit",        body.profit);
      _setColValue(sheet, headers, rowNum, "exchange_rate", body.exchange_rate);
      _setColValue(sheet, headers, rowNum, "updatedAt",     new Date().toISOString());
      return { updated: body.id };
    }
  }

  // 沒有就新增
  sheet.appendRow([
    body.id,
    body.sale          || 0,
    body.cost_cny      || 0,
    body.cost_twd      || 0,
    body.shipping_cost || 0,
    body.profit        || 0,
    body.exchange_rate || 0,
    new Date().toISOString()
  ]);
  return { created: body.id };
}

// ============================================================
//  共用工具函式
// ============================================================

/** 取得工作表，若不存在則建立並寫入標題 */
function getOrCreateSheet(name, headers) {
  var ss    = SPREADSHEET_ID && SPREADSHEET_ID !== "YOUR_SPREADSHEET_ID_HERE"
              ? SpreadsheetApp.openById(SPREADSHEET_ID)
              : SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(headers);
    // 讓標題列粗體、凍結
    sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/** 在指定列找到欄位並更新值 */
function _setColValue(sheet, headers, rowNum, colName, value) {
  var colIdx = headers.indexOf(colName);
  if (colIdx === -1) return;   // 欄位不存在就略過
  if (value === undefined || value === null) return;
  sheet.getRange(rowNum, colIdx + 1).setValue(value);
}
