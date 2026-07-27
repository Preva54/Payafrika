using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PayAfrika.API.Services;

namespace PayAfrika.API.Controllers;

[ApiController]
[Route("api/admin/fx-audit-logs")]
[Authorize]
public class FxAuditLogsController : ControllerBase
{
    private readonly IFxAuditService _audit;

    public FxAuditLogsController(IFxAuditService audit)
    {
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult> GetAll(
        [FromQuery] string? entityType, [FromQuery] string? action,
        [FromQuery] DateTime? from, [FromQuery] DateTime? to,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 50)
    {
        var logs = await _audit.GetLogsAsync(entityType, action, from, to, page, pageSize);
        var total = await _audit.GetTotalCountAsync(entityType, action, from, to);

        return Ok(new { logs, total, page, pageSize });
    }
}
