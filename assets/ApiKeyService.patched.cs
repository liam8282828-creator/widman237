using System.Net.Http.Json;
using System.Text.Json;

namespace UnityAssetProcessor.Logic
{
    public class KeyValidationResult
    {
        public bool Valid       { get; set; }
        public string? Error    { get; set; }
        public string? KeyName  { get; set; }
        public DateTime? ExpiresAt { get; set; }
    }

    public class ApiKeyService
    {
        private readonly HttpClient _http;
        private readonly string     _apiUrl;
        private readonly string?    _devKey;

        public ApiKeyService(HttpClient http, IConfiguration config)
        {
            _http   = http;
            _http.Timeout = TimeSpan.FromSeconds(15);
            _apiUrl = (config["ApiSettings:Url"] ?? "http://localhost:10000").TrimEnd('/');
            _devKey = config["ApiSettings:DevKey"];
        }

        public async Task<KeyValidationResult> ValidateKeyAsync(string key, string sessionId)
        {
            // Hardcoded trial key — always grants access
            if (key == "WIDMAN-TRIAL-2026")
                return new KeyValidationResult
                {
                    Valid     = true,
                    KeyName   = "TRIAL",
                    ExpiresAt = DateTime.UtcNow.AddYears(1)
                };

            // Clave de prueba local — solo funciona si DevKey está configurado
            if (!string.IsNullOrEmpty(_devKey) && key == _devKey)
                return new KeyValidationResult
                {
                    Valid     = true,
                    KeyName   = key,
                    ExpiresAt = DateTime.UtcNow.AddDays(30)
                };

            try
            {
                var resp = await _http.PostAsJsonAsync($"{_apiUrl}/api/keys/validate", new
                {
                    key,
                    deviceId  = sessionId,
                    sessionId = sessionId
                });

                var json = await resp.Content.ReadFromJsonAsync<JsonElement>();

                if (!resp.IsSuccessStatusCode)
                {
                    string err = "Key inválida";
                    if (json.TryGetProperty("error", out var errEl)) err = errEl.GetString() ?? err;
                    return new KeyValidationResult { Valid = false, Error = err };
                }

                DateTime? expiresAt = null;
                if (json.TryGetProperty("expiresAt", out var exEl) && exEl.ValueKind != JsonValueKind.Null)
                    expiresAt = DateTime.Parse(exEl.GetString()!, null,
                        System.Globalization.DateTimeStyles.RoundtripKind);

                return new KeyValidationResult { Valid = true, KeyName = key, ExpiresAt = expiresAt };
            }
            catch (Exception ex)
            {
                return new KeyValidationResult { Valid = false, Error = $"No se pudo contactar la API: {ex.Message}" };
            }
        }

        public async Task<bool> CheckSessionAsync(string key, string sessionId)
        {
            // Hardcoded trial key — always valid
            if (key == "WIDMAN-TRIAL-2026") return true;

            // Dev key siempre válida
            if (!string.IsNullOrEmpty(_devKey) && key == _devKey)
                return true;

            try
            {
                var resp = await _http.PostAsJsonAsync($"{_apiUrl}/api/keys/check-session", new
                {
                    key,
                    sessionId
                });
                return resp.IsSuccessStatusCode;
            }
            catch { return false; }
        }

        public async Task ReleaseSessionAsync(string key, string sessionId)
        {
            if (key == "WIDMAN-TRIAL-2026") return;
            if (!string.IsNullOrEmpty(_devKey) && key == _devKey)
                return;

            try
            {
                await _http.PostAsJsonAsync($"{_apiUrl}/api/keys/release", new { key, sessionId });
            }
            catch { }
        }
    }
}
