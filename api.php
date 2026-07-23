<?php
// Configuración de errores para desarrollo
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Headers CORS para permitir peticiones desde Vercel o cualquier dominio
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");
header("Content-Type: application/json; charset=UTF-8");

// Responder inmediatamente a las peticiones preflight (OPTIONS) de React
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Datos de conexión a la Base de Datos
$dbHost = '185.240.248.137';
$dbName = 'visualpt_easychart';
$dbUser = 'visualpt_easychart';
$dbPass = 'easychart1234'; // <-- Pon aquí la contraseña de la BD

// Conexión a la base de datos mediante PDO
try {
    $dsn = "mysql:host=$dbHost;dbname=$dbName;charset=utf8mb4";
    $pdo = new PDO($dsn, $dbUser, $dbPass, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ]);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed: ' . $e->getMessage()]);
    exit;
}

// Router según el método HTTP
$requestMethod = $_SERVER['REQUEST_METHOD'];

switch ($requestMethod) {
    case 'GET':
        handleGetRequest();
        break;
    case 'POST':
        handlePostRequest();
        break;
    case 'PUT':
        handlePutRequest();
        break;
    case 'DELETE':
        handleDeleteRequest();
        break;
    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        break;
}

// ------------------------------------------------------------------
// FUNCIONES DE MANEJO DE PETICIONES
// ------------------------------------------------------------------

function handleGetRequest() {
    global $pdo;
    
    if (isset($_GET['search'])) {
        $searchTerm = '%' . $_GET['search'] . '%';
        $stmt = $pdo->prepare("SELECT id, title, key_signature, tempo, time_signature FROM songs WHERE title LIKE ?");
        $stmt->execute([$searchTerm]);
        echo json_encode($stmt->fetchAll());
    } elseif (isset($_GET['id'])) {
        $stmt = $pdo->prepare("SELECT * FROM songs WHERE id = ?");
        $stmt->execute([$_GET['id']]);
        $song = $stmt->fetch();
        
        if ($song) {
            $song['song_data'] = json_decode($song['song_data'], true);
            echo json_encode($song);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Song not found']);
        }
    } else {
        $stmt = $pdo->query("SELECT id, title, key_signature, tempo, time_signature FROM songs");
        echo json_encode($stmt->fetchAll());
    }
}

function handlePostRequest() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $requiredFields = ['title', 'key_signature', 'tempo', 'time_signature', 'song_data'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    try {
        $stmt = $pdo->prepare("INSERT INTO songs (title, key_signature, tempo, time_signature, song_data) VALUES (?, ?, ?, ?, ?)");
        $stmt->execute([
            $data['title'],
            $data['key_signature'],
            $data['tempo'],
            $data['time_signature'],
            json_encode($data['song_data'])
        ]);
        
        $songId = $pdo->lastInsertId();
        echo json_encode([
            'id' => $songId,
            'message' => 'Song created successfully',
            'data' => $data
        ]);
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handlePutRequest() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    
    $requiredFields = ['id', 'title', 'key_signature', 'tempo', 'time_signature', 'song_data'];
    foreach ($requiredFields as $field) {
        if (!isset($data[$field])) {
            http_response_code(400);
            echo json_encode(['error' => "Missing required field: $field"]);
            return;
        }
    }
    
    try {
        $stmt = $pdo->prepare("UPDATE songs SET title = ?, key_signature = ?, tempo = ?, time_signature = ?, song_data = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
        $stmt->execute([
            $data['title'],
            $data['key_signature'],
            $data['tempo'],
            $data['time_signature'],
            json_encode($data['song_data']),
            $data['id']
        ]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Song updated successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Song not found or no changes made']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}

function handleDeleteRequest() {
    global $pdo;
    
    $data = json_decode(file_get_contents('php://input'), true);
    $id = $_GET['id'] ?? $data['id'] ?? null;
    
    if (!$id) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing song ID']);
        return;
    }
    
    try {
        $stmt = $pdo->prepare("DELETE FROM songs WHERE id = ?");
        $stmt->execute([$id]);
        
        if ($stmt->rowCount() > 0) {
            echo json_encode(['message' => 'Song deleted successfully']);
        } else {
            http_response_code(404);
            echo json_encode(['error' => 'Song not found']);
        }
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    }
}