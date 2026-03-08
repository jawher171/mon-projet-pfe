using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace Application.Hubs
{
    /// <summary>
    /// SignalR hub for real-time barcode scan communication between phone and PC.
    /// Phone joins a session group and sends scanned barcodes; PC listens for ScanDetected events.
    /// </summary>
    public class InventoryHub : Hub
    {
        /// <summary>Join a scan session group so the client receives ScanDetected events.</summary>
        public async Task JoinSession(string sessionId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"scan-{sessionId}");
        }

        /// <summary>Called by the phone scanner to broadcast a barcode to the PC session.</summary>
        public async Task SendScan(string sessionId, string purpose, string code)
        {
            await Clients.OthersInGroup($"scan-{sessionId}")
                         .SendAsync("ScanDetected", purpose, code);
        }
    }
}
