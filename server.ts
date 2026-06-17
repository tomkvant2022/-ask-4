import express, { Request, Response } from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Enable JSON request body parsing
  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // POST endpoint to generate custom Delphi/IIS/MS SQL configurations using Gemini API
  app.post("/api/generate-project", async (req: Request, res: Response) => {
    const { topic, architectureType } = req.body;

    if (!topic || !architectureType) {
      res.status(400).json({ error: "Поля 'topic' и 'architectureType' обязательны к заполнению." });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // Rich default presets in case the API key is not configured or fails
    const getPresetData = (t: string, arch: string) => {
      return {
        topic: t,
        architectureType: arch,
        status: "success",
        generatedAt: new Date().toISOString(),
        databaseDdl: `-- Инициализация базы данных MS SQL Server для темы: ${t}
CREATE DATABASE ${t.replace(/[^a-zA-Z0-9А-Яа-я]/g, "_")}_DB;
GO
USE ${t.replace(/[^a-zA-Z0-9А-Яа-я]/g, "_")}_DB;
GO

-- Таблица сотрудников / пользователей
CREATE TABLE Users (
    UserID INT IDENTITY(1,1) PRIMARY KEY,
    Username NVARCHAR(50) NOT NULL UNIQUE,
    PasswordHash VARCHAR(255) NOT NULL,
    FullName NVARCHAR(150),
    Role NVARCHAR(50) DEFAULT 'User',
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsActive BIT DEFAULT 1
);

-- Основная таблица сущностей
CREATE TABLE MainRecords (
    RecordID INT IDENTITY(1,1) PRIMARY KEY,
    Title NVARCHAR(100) NOT NULL,
    Description NVARCHAR(MAX),
    Category NVARCHAR(50),
    Status NVARCHAR(50) DEFAULT 'New',
    CreatedBy INT FOREIGN KEY REFERENCES Users(UserID),
    LastUpdated DATETIME DEFAULT GETDATE(),
    Price DECIMAL(18, 2) DEFAULT 0.00
);

-- Заполнение демонстрационными данными
INSERT INTO Users (Username, PasswordHash, FullName, Role) VALUES 
('admin', '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918', N'Администратор Системы', 'Administrator'),
('operator', '378f4bdfcdad23348f98c8c6976e5b5410415bde908bd4dee15dfb167a9c87', N'Оператор БД', 'Operator');

INSERT INTO MainRecords (Title, Description, Category, Status, CreatedBy, Price) VALUES
(N'Тестовая запись №1', N'Конфигурация оборудования для сервера IIS', N'Инфраструктура', N'Active', 1, 15000.00),
(N'Тестовая запись №2', N'Конспекты лекции по разработке на Delphi 10.2 Tokyo', N'Обучение', N'New', 2, 4500.00);
GO`,
        delphiCode: `unit WebModuleU;

interface

uses
  System.SysUtils, System.Classes, Web.HTTPApp, FireDAC.Stan.Intf,
  FireDAC.Stan.Option, FireDAC.Stan.Error, FireDAC.UI.Intf, FireDAC.Phys.Intf,
  FireDAC.Stan.Def, FireDAC.Stan.Pool, FireDAC.Stan.Async, FireDAC.Phys,
  FireDAC.Phys.MSSQL, FireDAC.Phys.MSSQLDef, FireDAC.VCLUI.Wait, FireDAC.Comp.Client,
  Data.DB, FPJson, Web.ReqMulti;

type
  TWebModule1 = class(TWebModule)
    FDConnection1: TFDConnection;
    FDPhysMSSQLDriverLink1: TFDPhysMSSQLDriverLink;
    procedure WebModule1DefaultHandlerAction(Sender: TObject;
      Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
    procedure WebModule1GetRecordsAction(Sender: TObject;
      Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
    procedure WebModule1CreateRecordAction(Sender: TObject;
      Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
  private
    { Private declarations }
  public
    { Public declarations }
  end;

var
  WebModuleClass: TComponentClass = TWebModule1;

implementation

{%CLASSGROUP 'Vcl.Controls.TControl'}

{$R *.dfm}

procedure TWebModule1.WebModule1DefaultHandlerAction(Sender: TObject;
  Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
begin
  Response.ContentType := 'text/html; charset=utf-8';
  Response.Content := 
    '<html><head><title>Delphi IIS Web Service</title></head>' +
    '<body>' +
    '<h1>Delphi 10.2 + IIS + MS SQL Web Server</h1>' +
    '<p>Сервис успешно работает! Выбранная тема: <b>' + Request.InternalPathInfo + '</b></p>' +
    '<p>Доступные API-точки:</p>' +
    '<ul>' +
    '  <li><b>/api/records</b> - Получение списка записей (GET)</li>' +
    '  <li><b>/api/records/create</b> - Создание новой записи (POST)</li>' +
    '</ul>' +
    '</body></html>';
end;

procedure TWebModule1.WebModule1GetRecordsAction(Sender: TObject;
  Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
var
  Query: TFDQuery;
  JSONArray: TJSONArray;
  JSONObject: TJSONObject;
begin
  Response.ContentType := 'application/json; charset=utf-8';
  
  Query := TFDQuery.Create(nil);
  try
    Query.Connection := FDConnection1;
    Query.SQL.Text := 'SELECT RecordID, Title, Description, Category, Price FROM MainRecords';
    Query.Open;
    
    JSONArray := TJSONArray.Create;
    while not Query.Eof do
    begin
      JSONObject := TJSONObject.Create;
      JSONObject.AddPair('id', TJSONNumber.Create(Query.FieldByName('RecordID').AsInteger));
      JSONObject.AddPair('title', TJSONString.Create(Query.FieldByName('Title').AsString));
      JSONObject.AddPair('description', TJSONString.Create(Query.FieldByName('Description').AsString));
      JSONObject.AddPair('category', TJSONString.Create(Query.FieldByName('Category').AsString));
      JSONObject.AddPair('price', TJSONNumber.Create(Query.FieldByName('Price').AsFloat));
      JSONArray.AddElement(JSONObject);
      Query.Next;
    end;
    
    Response.Content := JSONArray.ToJSON;
  finally
    Query.Free;
  end;
end;

procedure TWebModule1.WebModule1CreateRecordAction(Sender: TObject;
  Request: TWebRequest; Response: TWebResponse; var Handled: Boolean);
var
  Query: TFDQuery;
  JSONObj: TJSONObject;
  Title, Desc, Category: string;
  Price: Double;
begin
  Response.ContentType := 'application/json; charset=utf-8';
  
  // Простой парсинг входного JSON из тела POST
  try
    JSONObj := TJSONObject.ParseJSONValue(Request.Content) as TJSONObject;
    if Assigned(JSONObj) then
    try
      Title := JSONObj.GetValue('title').Value;
      Desc := JSONObj.GetValue('description').Value;
      Category := JSONObj.GetValue('category').Value;
      Price := StrToFloatDef(JSONObj.GetValue('price').Value, 0.0);
      
      Query := TFDQuery.Create(nil);
      try
        Query.Connection := FDConnection1;
        Query.SQL.Text := 'INSERT INTO MainRecords (Title, Description, Category, Price, CreatedBy) ' +
                          'VALUES (:title, :desc, :category, :price, 1)';
        Query.ParamByName('title').AsString := Title;
        Query.ParamByName('desc').AsString := Desc;
        Query.ParamByName('category').AsString := Category;
        Query.ParamByName('price').AsFloat := Price;
        Query.ExecSQL;
        
        Response.Content := '{"status": "success", "message": "Запись успешно добавлена в MS SQL!"}';
      finally
        Query.Free;
      end;
    finally
      JSONObj.Free;
    end
    else
      Response.Content := '{"status": "error", "message": "Невалидный JSON контент"}';
  except
    on E: Exception do
      Response.Content := '{"status": "error", "message": "' + E.Message + '"}';
  end;
end;

end.`,
        iisConfig: `1. Установка IIS и компонентов:
   - Включаем службу IIS через "Включение/отключение компонентов Windows".
   - Общие функции HTTP: Статический контент, Ошибки HTTP.
   - Разработка приложений: Расширения ISAPI и Фильтры ISAPI (Важно!), CGI (если выбран CGI).

2. Регистрация модуля в IIS:
   - Помещаем скомпилированную DLL (для ISAPI) или EXE (для CGI) в отдельную директорию на диске (например, C:\\inetpub\\delphi_app).
   - В консоли IIS выбираем сайт, нажимаем "Добавление виртуального каталога" (Псевдоним: app, путь: C:\\inetpub\\delphi_app).

3. Настройка ограничений ISAPI и CGI на уровне сервера (IIS Root):
   - Открыть 'Ограничения ISAPI и CGI' (ISAPI and CGI Restrictions).
   - Добавить разрешающее правило: Путь к файлу DLL/EXE, указать описание (например, 'DelphiApp'), отметить галочкой 'Разрешить выполнение'.

4. Настройка сопоставления обработчиков (Handler Mappings) виртуального каталога:
   - Выбрать созданный виртуальный каталог 'app'.
   - Перейти во вкладку 'Сопоставления обработчиков'.
   - Нажать 'Добавить сопоставление модуля' (Add Module Mapping).
   - Путь запроса: '*.dll' или '*'. Обработчик: 'IsapiModule'. Физический путь: путь к DLL/EXE.`,
        webConfigXml: `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
    <system.webServer>
        <handlers>
            <add name="DelphiISAPIHandler" 
                 path="*.dll" 
                 verb="*" 
                 modules="IsapiModule" 
                 scriptProcessor="C:\\inetpub\\delphi_app\\WebModuleProject.dll" 
                 resourceType="File" 
                 requireAccess="Execute" />
        </handlers>
        <directoryBrowse enabled="false" />
        <httpErrors errorMode="Detailed" />
    </system.webServer>
</configuration>`,
        deploymentGuide: `1. Убедитесь, что на сервере с IIS установлены клиентские библиотеки MS SQL Server (Native Client / OLE DB).
2. Настройте параметры подключения в FDConnection1 (Host, Database, User_Name, Password).
3. При сборке 64-битного ISAPI DLL в Delphi проверьте, чтобы пул приложений (Application Pool) в IIS запускался с поддержкой 64 битных приложений (обычно по умолчанию). Если DLL 32-битная, включите опцию32-Bit Applications = True в дополнительных параметрах пула.
4. Предоставьте права на чтение и выполнение группе пользователей IIS_IUSRS к каталогу с вашим Delphi приложением.`,
        usingPreset: true
      };
    };

    if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
      res.json(getPresetData(topic, architectureType));
      return;
    }

    try {
      // Initialize the Gemini SDK lazily to avoid crashes if API key configuration has issues
      const ai = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const prompt = `Выступи в роли эксперта по Delphi-разработке и системного архитектора IIS + MS SQL.
Пользователь хочет проанализировать и спроектировать веб-приложение на тему: "${topic}" с использованием архитектуры: "${architectureType}".
База данных должна быть развернута на СУБД MS SQL Server.

Сгенерируй детальный, качественный технический проект решения на русском языке. Ответ должен быть строго в формате JSON, соответствующем схеме, без лишнего форматирования и разметки, готовый для парсинга на сервере.

Схема JSON, которую ТЫ ДОЛЖЕН соблюдать:
{
  "topic": "${topic}",
  "architectureType": "${architectureType}",
  "status": "success",
  "generatedAt": "ISO string",
  "databaseDdl": "Полные DDL-скрипты SQL Server для этой темы с комментариями (создание таблиц с ключами, типами VARCHAR/NVARCHAR, связями и insert демо-данными)",
  "delphiCode": "Реальный исходный код на Object Pascal (Delphi WebModule или контроллер uniGUI/IntraWeb в зависимости от типа архитектуры) с обработчиками GET/POST запросов для работы со сгенерированной базой данных через компоненты FireDAC (TFDConnection, TFDQuery) и генерацией ответов в JSON",
  "iisConfig": "Детальное руководство по пошаговой настройке IIS для данного типа сборки (ISAPI/CGI/Standalone/Reverse Proxy) на русском языке",
  "webConfigXml": "Готовый рабочий XML код файла web.config для IIS для корректной маршрутизации запросов к нашему приложению",
  "deploymentGuide": "Рекомендации по развертыванию, отладке, производительности и защите от SQL-инъекций и крашей в связке Delphi + IIS + MS SQL",
  "usingPreset": false
}

Пожалуйста, будь максимально подробным. Код Delphi должен содержать реальные структуры, методы и обработчики, а не просто пустые комментарии. SQL скрипт должен содержать не менее 3 логически связанных таблиц, спроектированных под предметную область "${topic}".`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1,
        }
      });

      const resultText = response.text || "";
      let parsedResult;
      try {
        parsedResult = JSON.parse(resultText.trim());
        // Enforce usingPreset property if not present
        parsedResult.usingPreset = false;
        res.json(parsedResult);
      } catch (parseError) {
        console.error("Failed to parse Gemini output as JSON, falling back to preset.", parseError);
        console.log("Raw output was:", resultText);
        res.json(getPresetData(topic, architectureType));
      }
    } catch (error) {
      console.error("Gemini API error, falling back to preset:", error);
      res.json(getPresetData(topic, architectureType));
    }
  });

  // Serve static assets and mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express full-stack server running on http://localhost:${PORT}`);
  });
}

startServer();
