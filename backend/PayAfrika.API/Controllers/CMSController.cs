using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PayAfrika.API.Data;
using PayAfrika.API.Models;

namespace PayAfrika.API.Controllers;

[Route("api/cms")]
[ApiController]
[Authorize(Roles = "admin")]
public class CMSController : ControllerBase
{
    private readonly AppDbContext _db;
    public CMSController(AppDbContext db) { _db = db; }

    // ─── Content Pages ─────────────────────────────────────────
    [HttpGet("pages")] public async Task<IActionResult> GetPages() => Ok(await _db.ContentPages.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpGet("pages/{id}")] public async Task<IActionResult> GetPage(Guid id) => Ok(await _db.ContentPages.FindAsync(id));
    [HttpPost("pages")] public async Task<IActionResult> CreatePage([FromBody] ContentPage page) { page.Id = Guid.NewGuid(); page.CreatedAt = page.UpdatedAt = DateTime.UtcNow; _db.ContentPages.Add(page); await SaveWithVersion(page.Id, "ContentPage", page); return CreatedAtAction(nameof(GetPage), new { id = page.Id }, page); }
    [HttpPut("pages/{id}")] public async Task<IActionResult> UpdatePage(Guid id, [FromBody] ContentPage data) { var page = await _db.ContentPages.FindAsync(id); if (page == null) return NotFound(); page.Title = data.Title; page.Slug = data.Slug; page.Content = data.Content; page.Status = data.Status; page.Template = data.Template; page.Metadata = data.Metadata; page.SortOrder = data.SortOrder; page.ScheduledAt = data.ScheduledAt; page.UpdatedAt = DateTime.UtcNow; if (data.Status == "published") page.PublishedAt ??= DateTime.UtcNow; await SaveWithVersion(id, "ContentPage", page); return Ok(page); }
    [HttpDelete("pages/{id}")] public async Task<IActionResult> DeletePage(Guid id) { var page = await _db.ContentPages.FindAsync(id); if (page == null) return NotFound(); _db.ContentPages.Remove(page); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Blog ────────────────────────────────────────────────────
    [HttpGet("blog/categories")] public async Task<IActionResult> GetBlogCategories() => Ok(await _db.BlogCategories.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("blog/categories")] public async Task<IActionResult> CreateBlogCategory([FromBody] BlogCategory c) { c.Id = Guid.NewGuid(); _db.BlogCategories.Add(c); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetBlogCategories), new { id = c.Id }, c); }
    [HttpPut("blog/categories/{id}")] public async Task<IActionResult> UpdateBlogCategory(Guid id, [FromBody] BlogCategory data) { var c = await _db.BlogCategories.FindAsync(id); if (c == null) return NotFound(); c.Name = data.Name; c.Slug = data.Slug; c.Description = data.Description; c.SortOrder = data.SortOrder; await _db.SaveChangesAsync(); return Ok(c); }
    [HttpDelete("blog/categories/{id}")] public async Task<IActionResult> DeleteBlogCategory(Guid id) { var c = await _db.BlogCategories.FindAsync(id); if (c == null) return NotFound(); _db.BlogCategories.Remove(c); await _db.SaveChangesAsync(); return NoContent(); }
    [HttpGet("blog/posts")] public async Task<IActionResult> GetBlogPosts() => Ok(await _db.BlogPosts.Include(x => x.Category).OrderByDescending(x => x.CreatedAt).ToListAsync());
    [HttpGet("blog/posts/{id}")] public async Task<IActionResult> GetBlogPost(Guid id) => Ok(await _db.BlogPosts.Include(x => x.Category).FirstOrDefaultAsync(x => x.Id == id));
    [HttpPost("blog/posts")] public async Task<IActionResult> CreateBlogPost([FromBody] BlogPost post) { post.Id = Guid.NewGuid(); post.CreatedAt = post.UpdatedAt = DateTime.UtcNow; _db.BlogPosts.Add(post); await SaveWithVersion(post.Id, "BlogPost", post); return CreatedAtAction(nameof(GetBlogPost), new { id = post.Id }, post); }
    [HttpPut("blog/posts/{id}")] public async Task<IActionResult> UpdateBlogPost(Guid id, [FromBody] BlogPost data) { var post = await _db.BlogPosts.FindAsync(id); if (post == null) return NotFound(); post.Title = data.Title; post.Slug = data.Slug; post.Content = data.Content; post.Excerpt = data.Excerpt; post.FeaturedImage = data.FeaturedImage; post.CategoryId = data.CategoryId; post.Tags = data.Tags; post.Status = data.Status; post.IsFeatured = data.IsFeatured; post.SeoTitle = data.SeoTitle; post.SeoDescription = data.SeoDescription; post.OpenGraphImage = data.OpenGraphImage; post.ScheduledAt = data.ScheduledAt; post.UpdatedAt = DateTime.UtcNow; if (data.Status == "published") post.PublishedAt ??= DateTime.UtcNow; await SaveWithVersion(id, "BlogPost", post); return Ok(post); }
    [HttpDelete("blog/posts/{id}")] public async Task<IActionResult> DeleteBlogPost(Guid id) { var post = await _db.BlogPosts.FindAsync(id); if (post == null) return NotFound(); _db.BlogPosts.Remove(post); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Services ────────────────────────────────────────────────
    [HttpGet("services")] public async Task<IActionResult> GetServices() => Ok(await _db.Services.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpGet("services/{id}")] public async Task<IActionResult> GetService(Guid id) => Ok(await _db.Services.FindAsync(id));
    [HttpPost("services")] public async Task<IActionResult> CreateService([FromBody] Service s) { s.Id = Guid.NewGuid(); s.CreatedAt = s.UpdatedAt = DateTime.UtcNow; _db.Services.Add(s); await SaveWithVersion(s.Id, "Service", s); return CreatedAtAction(nameof(GetService), new { id = s.Id }, s); }
    [HttpPut("services/{id}")] public async Task<IActionResult> UpdateService(Guid id, [FromBody] Service data) { var s = await _db.Services.FindAsync(id); if (s == null) return NotFound(); s.Name = data.Name; s.Slug = data.Slug; s.Icon = data.Icon; s.HeroImage = data.HeroImage; s.Description = data.Description; s.Features = data.Features; s.Pricing = data.Pricing; s.Faq = data.Faq; s.CtaText = data.CtaText; s.CtaUrl = data.CtaUrl; s.SeoTitle = data.SeoTitle; s.SeoDescription = data.SeoDescription; s.Status = data.Status; s.SortOrder = data.SortOrder; s.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "Service", s); return Ok(s); }
    [HttpDelete("services/{id}")] public async Task<IActionResult> DeleteService(Guid id) { var s = await _db.Services.FindAsync(id); if (s == null) return NotFound(); _db.Services.Remove(s); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Products ────────────────────────────────────────────────
    [HttpGet("products")] public async Task<IActionResult> GetProducts() => Ok(await _db.Products.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpGet("products/{id}")] public async Task<IActionResult> GetProduct(Guid id) => Ok(await _db.Products.FindAsync(id));
    [HttpPost("products")] public async Task<IActionResult> CreateProduct([FromBody] Product p) { p.Id = Guid.NewGuid(); p.CreatedAt = p.UpdatedAt = DateTime.UtcNow; _db.Products.Add(p); await SaveWithVersion(p.Id, "Product", p); return CreatedAtAction(nameof(GetProduct), new { id = p.Id }, p); }
    [HttpPut("products/{id}")] public async Task<IActionResult> UpdateProduct(Guid id, [FromBody] Product data) { var p = await _db.Products.FindAsync(id); if (p == null) return NotFound(); p.Name = data.Name; p.Slug = data.Slug; p.Description = data.Description; p.Images = data.Images; p.Videos = data.Videos; p.Features = data.Features; p.Pricing = data.Pricing; p.Documentation = data.Documentation; p.DownloadLinks = data.DownloadLinks; p.SeoTitle = data.SeoTitle; p.SeoDescription = data.SeoDescription; p.Status = data.Status; p.SortOrder = data.SortOrder; p.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "Product", p); return Ok(p); }
    [HttpDelete("products/{id}")] public async Task<IActionResult> DeleteProduct(Guid id) { var p = await _db.Products.FindAsync(id); if (p == null) return NotFound(); _db.Products.Remove(p); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Testimonials ────────────────────────────────────────────
    [HttpGet("testimonials")] public async Task<IActionResult> GetTestimonials() => Ok(await _db.Testimonials.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("testimonials")] public async Task<IActionResult> CreateTestimonial([FromBody] Testimonial t) { t.Id = Guid.NewGuid(); t.CreatedAt = DateTime.UtcNow; _db.Testimonials.Add(t); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetTestimonials), new { id = t.Id }, t); }
    [HttpPut("testimonials/{id}")] public async Task<IActionResult> UpdateTestimonial(Guid id, [FromBody] Testimonial data) { var t = await _db.Testimonials.FindAsync(id); if (t == null) return NotFound(); t.CustomerName = data.CustomerName; t.CustomerPhoto = data.CustomerPhoto; t.CompanyLogo = data.CompanyLogo; t.CompanyName = data.CompanyName; t.Content = data.Content; t.Rating = data.Rating; t.VideoUrl = data.VideoUrl; t.Type = data.Type; t.IsFeatured = data.IsFeatured; t.SortOrder = data.SortOrder; t.Status = data.Status; await _db.SaveChangesAsync(); return Ok(t); }
    [HttpDelete("testimonials/{id}")] public async Task<IActionResult> DeleteTestimonial(Guid id) { var t = await _db.Testimonials.FindAsync(id); if (t == null) return NotFound(); _db.Testimonials.Remove(t); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Team Members ────────────────────────────────────────────
    [HttpGet("team")] public async Task<IActionResult> GetTeamMembers() => Ok(await _db.CmsTeamMembers.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("team")] public async Task<IActionResult> CreateTeamMember([FromBody] CmsTeamMember m) { m.Id = Guid.NewGuid(); m.CreatedAt = DateTime.UtcNow; _db.CmsTeamMembers.Add(m); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetTeamMembers), new { id = m.Id }, m); }
    [HttpPut("team/{id}")] public async Task<IActionResult> UpdateTeamMember(Guid id, [FromBody] CmsTeamMember data) { var m = await _db.CmsTeamMembers.FindAsync(id); if (m == null) return NotFound(); m.Name = data.Name; m.Photo = data.Photo; m.Role = data.Role; m.Biography = data.Biography; m.LinkedIn = data.LinkedIn; m.Twitter = data.Twitter; m.Email = data.Email; m.Phone = data.Phone; m.Department = data.Department; m.SortOrder = data.SortOrder; m.Status = data.Status; await _db.SaveChangesAsync(); return Ok(m); }
    [HttpDelete("team/{id}")] public async Task<IActionResult> DeleteTeamMember(Guid id) { var m = await _db.CmsTeamMembers.FindAsync(id); if (m == null) return NotFound(); _db.CmsTeamMembers.Remove(m); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Partners ────────────────────────────────────────────────
    [HttpGet("partners")] public async Task<IActionResult> GetPartners() => Ok(await _db.Partners.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("partners")] public async Task<IActionResult> CreatePartner([FromBody] Partner p) { p.Id = Guid.NewGuid(); p.CreatedAt = DateTime.UtcNow; _db.Partners.Add(p); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetPartners), new { id = p.Id }, p); }
    [HttpPut("partners/{id}")] public async Task<IActionResult> UpdatePartner(Guid id, [FromBody] Partner data) { var p = await _db.Partners.FindAsync(id); if (p == null) return NotFound(); p.Name = data.Name; p.LogoUrl = data.LogoUrl; p.Description = data.Description; p.Website = data.Website; p.Type = data.Type; p.IsFeatured = data.IsFeatured; p.SortOrder = data.SortOrder; p.Status = data.Status; await _db.SaveChangesAsync(); return Ok(p); }
    [HttpDelete("partners/{id}")] public async Task<IActionResult> DeletePartner(Guid id) { var p = await _db.Partners.FindAsync(id); if (p == null) return NotFound(); _db.Partners.Remove(p); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Careers ─────────────────────────────────────────────────
    [HttpGet("careers")] public async Task<IActionResult> GetJobs() => Ok(await _db.JobPositions.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpGet("careers/{id}")] public async Task<IActionResult> GetJob(Guid id) => Ok(await _db.JobPositions.FindAsync(id));
    [HttpPost("careers")] public async Task<IActionResult> CreateJob([FromBody] JobPosition j) { j.Id = Guid.NewGuid(); j.CreatedAt = j.UpdatedAt = DateTime.UtcNow; _db.JobPositions.Add(j); await SaveWithVersion(j.Id, "JobPosition", j); return CreatedAtAction(nameof(GetJob), new { id = j.Id }, j); }
    [HttpPut("careers/{id}")] public async Task<IActionResult> UpdateJob(Guid id, [FromBody] JobPosition data) { var j = await _db.JobPositions.FindAsync(id); if (j == null) return NotFound(); j.Title = data.Title; j.Department = data.Department; j.Location = data.Location; j.EmploymentType = data.EmploymentType; j.SalaryMin = data.SalaryMin; j.SalaryMax = data.SalaryMax; j.Description = data.Description; j.Requirements = data.Requirements; j.Benefits = data.Benefits; j.HiringManager = data.HiringManager; j.ClosingDate = data.ClosingDate; j.SortOrder = data.SortOrder; j.Status = data.Status; j.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "JobPosition", j); return Ok(j); }
    [HttpDelete("careers/{id}")] public async Task<IActionResult> DeleteJob(Guid id) { var j = await _db.JobPositions.FindAsync(id); if (j == null) return NotFound(); _db.JobPositions.Remove(j); await _db.SaveChangesAsync(); return NoContent(); }
    [HttpGet("careers/applications")] public async Task<IActionResult> GetJobApplications() => Ok(await _db.JobApplications.Include(x => x.Position).OrderByDescending(x => x.CreatedAt).ToListAsync());

    // ─── FAQ ─────────────────────────────────────────────────────
    [HttpGet("faq/categories")] public async Task<IActionResult> GetFaqCategories() => Ok(await _db.FaqCategories.ToListAsync());
    [HttpPost("faq/categories")] public async Task<IActionResult> CreateFaqCategory([FromBody] FaqCategory c) { c.Id = Guid.NewGuid(); _db.FaqCategories.Add(c); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetFaqCategories), new { id = c.Id }, c); }
    [HttpPut("faq/categories/{id}")] public async Task<IActionResult> UpdateFaqCategory(Guid id, [FromBody] FaqCategory data) { var c = await _db.FaqCategories.FindAsync(id); if (c == null) return NotFound(); c.Name = data.Name; c.SortOrder = data.SortOrder; await _db.SaveChangesAsync(); return Ok(c); }
    [HttpDelete("faq/categories/{id}")] public async Task<IActionResult> DeleteFaqCategory(Guid id) { var c = await _db.FaqCategories.FindAsync(id); if (c == null) return NotFound(); _db.FaqCategories.Remove(c); await _db.SaveChangesAsync(); return NoContent(); }
    [HttpGet("faq")] public async Task<IActionResult> GetFaqs() => Ok(await _db.Faqs.Include(x => x.Category).OrderBy(x => x.Priority).ToListAsync());
    [HttpPost("faq")] public async Task<IActionResult> CreateFaq([FromBody] Faq f) { f.Id = Guid.NewGuid(); f.CreatedAt = DateTime.UtcNow; _db.Faqs.Add(f); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetFaqs), new { id = f.Id }, f); }
    [HttpPut("faq/{id}")] public async Task<IActionResult> UpdateFaq(Guid id, [FromBody] Faq data) { var f = await _db.Faqs.FindAsync(id); if (f == null) return NotFound(); f.Question = data.Question; f.Answer = data.Answer; f.CategoryId = data.CategoryId; f.Priority = data.Priority; f.RelatedFaqs = data.RelatedFaqs; f.Status = data.Status; await _db.SaveChangesAsync(); return Ok(f); }
    [HttpDelete("faq/{id}")] public async Task<IActionResult> DeleteFaq(Guid id) { var f = await _db.Faqs.FindAsync(id); if (f == null) return NotFound(); _db.Faqs.Remove(f); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Media Library ───────────────────────────────────────────
    [HttpGet("media/folders")] public async Task<IActionResult> GetMediaFolders() => Ok(await _db.MediaFolders.ToListAsync());
    [HttpPost("media/folders")] public async Task<IActionResult> CreateMediaFolder([FromBody] MediaFolder f) { f.Id = Guid.NewGuid(); f.CreatedAt = DateTime.UtcNow; _db.MediaFolders.Add(f); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetMediaFolders), new { id = f.Id }, f); }
    [HttpPut("media/folders/{id}")] public async Task<IActionResult> UpdateMediaFolder(Guid id, [FromBody] MediaFolder data) { var f = await _db.MediaFolders.FindAsync(id); if (f == null) return NotFound(); f.Name = data.Name; f.ParentId = data.ParentId; await _db.SaveChangesAsync(); return Ok(f); }
    [HttpDelete("media/folders/{id}")] public async Task<IActionResult> DeleteMediaFolder(Guid id) { var f = await _db.MediaFolders.FindAsync(id); if (f == null) return NotFound(); _db.MediaFolders.Remove(f); await _db.SaveChangesAsync(); return NoContent(); }
    [HttpGet("media/files")] public async Task<IActionResult> GetMediaFiles() => Ok(await _db.MediaFiles.OrderByDescending(x => x.CreatedAt).ToListAsync());
    [HttpPost("media/files")] public async Task<IActionResult> CreateMediaFile([FromBody] MediaFile f) { f.Id = Guid.NewGuid(); f.CreatedAt = DateTime.UtcNow; _db.MediaFiles.Add(f); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetMediaFiles), new { id = f.Id }, f); }
    [HttpPut("media/files/{id}")] public async Task<IActionResult> UpdateMediaFile(Guid id, [FromBody] MediaFile data) { var f = await _db.MediaFiles.FindAsync(id); if (f == null) return NotFound(); f.Name = data.Name; f.Alt = data.Alt; f.FolderId = data.FolderId; await _db.SaveChangesAsync(); return Ok(f); }
    [HttpDelete("media/files/{id}")] public async Task<IActionResult> DeleteMediaFile(Guid id) { var f = await _db.MediaFiles.FindAsync(id); if (f == null) return NotFound(); _db.MediaFiles.Remove(f); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Navigation ──────────────────────────────────────────────
    [HttpGet("navigation")] public async Task<IActionResult> GetNavigations() => Ok(await _db.NavigationMenus.ToListAsync());
    [HttpPost("navigation")] public async Task<IActionResult> CreateNavigation([FromBody] NavigationMenu n) { n.Id = Guid.NewGuid(); n.CreatedAt = n.UpdatedAt = DateTime.UtcNow; _db.NavigationMenus.Add(n); await SaveWithVersion(n.Id, "NavigationMenu", n); return CreatedAtAction(nameof(GetNavigations), new { id = n.Id }, n); }
    [HttpPut("navigation/{id}")] public async Task<IActionResult> UpdateNavigation(Guid id, [FromBody] NavigationMenu data) { var n = await _db.NavigationMenus.FindAsync(id); if (n == null) return NotFound(); n.Name = data.Name; n.Location = data.Location; n.Items = data.Items; n.Status = data.Status; n.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "NavigationMenu", n); return Ok(n); }
    [HttpDelete("navigation/{id}")] public async Task<IActionResult> DeleteNavigation(Guid id) { var n = await _db.NavigationMenus.FindAsync(id); if (n == null) return NotFound(); _db.NavigationMenus.Remove(n); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Footer ──────────────────────────────────────────────────
    [HttpGet("footer")] public async Task<IActionResult> GetFooter() => Ok(await _db.FooterConfigs.FirstOrDefaultAsync());
    [HttpPut("footer/{id}")] public async Task<IActionResult> UpdateFooter(Guid id, [FromBody] FooterConfig data) { var f = await _db.FooterConfigs.FindAsync(id); if (f == null) return NotFound(); f.CompanyInfo = data.CompanyInfo; f.Links = data.Links; f.SocialMedia = data.SocialMedia; f.Newsletter = data.Newsletter; f.ContactInfo = data.ContactInfo; f.Certifications = data.Certifications; f.PaymentLogos = data.PaymentLogos; f.LegalLinks = data.LegalLinks; f.Copyright = data.Copyright; f.Status = data.Status; f.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(f); }

    // ─── Popups ──────────────────────────────────────────────────
    [HttpGet("popups")] public async Task<IActionResult> GetPopups() => Ok(await _db.Popups.ToListAsync());
    [HttpPost("popups")] public async Task<IActionResult> CreatePopup([FromBody] Popup p) { p.Id = Guid.NewGuid(); p.CreatedAt = p.UpdatedAt = DateTime.UtcNow; _db.Popups.Add(p); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetPopups), new { id = p.Id }, p); }
    [HttpPut("popups/{id}")] public async Task<IActionResult> UpdatePopup(Guid id, [FromBody] Popup data) { var p = await _db.Popups.FindAsync(id); if (p == null) return NotFound(); p.Title = data.Title; p.Content = data.Content; p.Type = data.Type; p.Status = data.Status; p.Scheduling = data.Scheduling; p.TargetAudience = data.TargetAudience; p.DisplayRules = data.DisplayRules; p.Animation = data.Animation; p.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(p); }
    [HttpDelete("popups/{id}")] public async Task<IActionResult> DeletePopup(Guid id) { var p = await _db.Popups.FindAsync(id); if (p == null) return NotFound(); _db.Popups.Remove(p); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Announcements ───────────────────────────────────────────
    [HttpGet("announcements")] public async Task<IActionResult> GetAnnouncements() => Ok(await _db.Announcements.ToListAsync());
    [HttpPost("announcements")] public async Task<IActionResult> CreateAnnouncement([FromBody] Announcement a) { a.Id = Guid.NewGuid(); a.CreatedAt = DateTime.UtcNow; _db.Announcements.Add(a); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetAnnouncements), new { id = a.Id }, a); }
    [HttpPut("announcements/{id}")] public async Task<IActionResult> UpdateAnnouncement(Guid id, [FromBody] Announcement data) { var a = await _db.Announcements.FindAsync(id); if (a == null) return NotFound(); a.Title = data.Title; a.Message = data.Message; a.Type = data.Type; a.Status = data.Status; a.TargetRoles = data.TargetRoles; a.StartAt = data.StartAt; a.EndAt = data.EndAt; await _db.SaveChangesAsync(); return Ok(a); }
    [HttpDelete("announcements/{id}")] public async Task<IActionResult> DeleteAnnouncement(Guid id) { var a = await _db.Announcements.FindAsync(id); if (a == null) return NotFound(); _db.Announcements.Remove(a); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Forms ───────────────────────────────────────────────────
    [HttpGet("forms")] public async Task<IActionResult> GetForms() => Ok(await _db.CmsForms.ToListAsync());
    [HttpGet("forms/{id}")] public async Task<IActionResult> GetForm(Guid id) => Ok(await _db.CmsForms.FindAsync(id));
    [HttpPost("forms")] public async Task<IActionResult> CreateForm([FromBody] CmsForm f) { f.Id = Guid.NewGuid(); f.CreatedAt = f.UpdatedAt = DateTime.UtcNow; _db.CmsForms.Add(f); await _db.SaveChangesAsync(); return CreatedAtAction(nameof(GetForms), new { id = f.Id }, f); }
    [HttpPut("forms/{id}")] public async Task<IActionResult> UpdateForm(Guid id, [FromBody] CmsForm data) { var f = await _db.CmsForms.FindAsync(id); if (f == null) return NotFound(); f.Name = data.Name; f.Fields = data.Fields; f.SuccessMessage = data.SuccessMessage; f.EmailNotifications = data.EmailNotifications; f.ValidationRules = data.ValidationRules; f.Status = data.Status; f.UpdatedAt = DateTime.UtcNow; await _db.SaveChangesAsync(); return Ok(f); }
    [HttpDelete("forms/{id}")] public async Task<IActionResult> DeleteForm(Guid id) { var f = await _db.CmsForms.FindAsync(id); if (f == null) return NotFound(); _db.CmsForms.Remove(f); await _db.SaveChangesAsync(); return NoContent(); }
    [HttpGet("forms/{id}/submissions")] public async Task<IActionResult> GetFormSubmissions(Guid id) => Ok(await _db.FormSubmissions.Where(x => x.FormId == id).OrderByDescending(x => x.CreatedAt).ToListAsync());

    // ─── Legal ───────────────────────────────────────────────────
    [HttpGet("legal")] public async Task<IActionResult> GetLegalPages() => Ok(await _db.LegalPages.ToListAsync());
    [HttpPost("legal")] public async Task<IActionResult> CreateLegalPage([FromBody] LegalPage p) { p.Id = Guid.NewGuid(); p.CreatedAt = p.UpdatedAt = DateTime.UtcNow; _db.LegalPages.Add(p); await SaveWithVersion(p.Id, "LegalPage", p); return CreatedAtAction(nameof(GetLegalPages), new { id = p.Id }, p); }
    [HttpPut("legal/{id}")] public async Task<IActionResult> UpdateLegalPage(Guid id, [FromBody] LegalPage data) { var p = await _db.LegalPages.FindAsync(id); if (p == null) return NotFound(); p.Title = data.Title; p.Slug = data.Slug; p.Content = data.Content; p.Status = data.Status; p.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "LegalPage", p); return Ok(p); }
    [HttpDelete("legal/{id}")] public async Task<IActionResult> DeleteLegalPage(Guid id) { var p = await _db.LegalPages.FindAsync(id); if (p == null) return NotFound(); _db.LegalPages.Remove(p); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── API Docs ────────────────────────────────────────────────
    [HttpGet("api-docs")] public async Task<IActionResult> GetApiDocs() => Ok(await _db.ApiDocs.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("api-docs")] public async Task<IActionResult> CreateApiDoc([FromBody] ApiDoc d) { d.Id = Guid.NewGuid(); d.CreatedAt = d.UpdatedAt = DateTime.UtcNow; _db.ApiDocs.Add(d); await SaveWithVersion(d.Id, "ApiDoc", d); return CreatedAtAction(nameof(GetApiDocs), new { id = d.Id }, d); }
    [HttpPut("api-docs/{id}")] public async Task<IActionResult> UpdateApiDoc(Guid id, [FromBody] ApiDoc data) { var d = await _db.ApiDocs.FindAsync(id); if (d == null) return NotFound(); d.Title = data.Title; d.Slug = data.Slug; d.Content = data.Content; d.Category = data.Category; d.SortOrder = data.SortOrder; d.Status = data.Status; d.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "ApiDoc", d); return Ok(d); }
    [HttpDelete("api-docs/{id}")] public async Task<IActionResult> DeleteApiDoc(Guid id) { var d = await _db.ApiDocs.FindAsync(id); if (d == null) return NotFound(); _db.ApiDocs.Remove(d); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Support Content ─────────────────────────────────────────
    [HttpGet("support-content")] public async Task<IActionResult> GetSupportContents() => Ok(await _db.SupportContents.OrderBy(x => x.SortOrder).ToListAsync());
    [HttpPost("support-content")] public async Task<IActionResult> CreateSupportContent([FromBody] SupportContent c) { c.Id = Guid.NewGuid(); c.CreatedAt = c.UpdatedAt = DateTime.UtcNow; _db.SupportContents.Add(c); await SaveWithVersion(c.Id, "SupportContent", c); return CreatedAtAction(nameof(GetSupportContents), new { id = c.Id }, c); }
    [HttpPut("support-content/{id}")] public async Task<IActionResult> UpdateSupportContent(Guid id, [FromBody] SupportContent data) { var c = await _db.SupportContents.FindAsync(id); if (c == null) return NotFound(); c.Title = data.Title; c.Slug = data.Slug; c.Content = data.Content; c.Category = data.Category; c.SortOrder = data.SortOrder; c.Status = data.Status; c.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "SupportContent", c); return Ok(c); }
    [HttpDelete("support-content/{id}")] public async Task<IActionResult> DeleteSupportContent(Guid id) { var c = await _db.SupportContents.FindAsync(id); if (c == null) return NotFound(); _db.SupportContents.Remove(c); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Campaigns ───────────────────────────────────────────────
    [HttpGet("campaigns")] public async Task<IActionResult> GetCampaigns() => Ok(await _db.Campaigns.ToListAsync());
    [HttpPost("campaigns")] public async Task<IActionResult> CreateCampaign([FromBody] Campaign c) { c.Id = Guid.NewGuid(); c.CreatedAt = c.UpdatedAt = DateTime.UtcNow; _db.Campaigns.Add(c); await SaveWithVersion(c.Id, "Campaign", c); return CreatedAtAction(nameof(GetCampaigns), new { id = c.Id }, c); }
    [HttpPut("campaigns/{id}")] public async Task<IActionResult> UpdateCampaign(Guid id, [FromBody] Campaign data) { var c = await _db.Campaigns.FindAsync(id); if (c == null) return NotFound(); c.Name = data.Name; c.Description = data.Description; c.Type = data.Type; c.Status = data.Status; c.StartDate = data.StartDate; c.EndDate = data.EndDate; c.TargetAudience = data.TargetAudience; c.Content = data.Content; c.UpdatedAt = DateTime.UtcNow; await SaveWithVersion(id, "Campaign", c); return Ok(c); }
    [HttpDelete("campaigns/{id}")] public async Task<IActionResult> DeleteCampaign(Guid id) { var c = await _db.Campaigns.FindAsync(id); if (c == null) return NotFound(); _db.Campaigns.Remove(c); await _db.SaveChangesAsync(); return NoContent(); }

    // ─── Versions & Revisions ────────────────────────────────────
    [HttpGet("versions/{entityType}/{entityId}")] public async Task<IActionResult> GetVersions(string entityType, Guid entityId) => Ok(await _db.ContentVersions.Where(x => x.EntityType == entityType && x.EntityId == entityId).OrderByDescending(x => x.Version).ToListAsync());
    [HttpGet("versions/{entityType}/{entityId}/{version}")] public async Task<IActionResult> GetVersion(string entityType, Guid entityId, int version) => Ok(await _db.ContentVersions.FirstOrDefaultAsync(x => x.EntityType == entityType && x.EntityId == entityId && x.Version == version));
    [HttpPost("versions/{entityType}/{entityId}/restore/{version}")] public async Task<IActionResult> RestoreVersion(string entityType, Guid entityId, int version) { var v = await _db.ContentVersions.FirstOrDefaultAsync(x => x.EntityType == entityType && x.EntityId == entityId && x.Version == version); if (v == null) return NotFound(); return Ok(v); }
    [HttpGet("revisions/{entityType}/{entityId}")] public async Task<IActionResult> GetRevisions(string entityType, Guid entityId) => Ok(await _db.ContentRevisions.Where(x => x.EntityType == entityType && x.EntityId == entityId).OrderByDescending(x => x.CreatedAt).ToListAsync());

    // ─── Workflow ────────────────────────────────────────────────
    [HttpPost("{entityType}/{entityId}/workflow")] public async Task<IActionResult> UpdateWorkflow(string entityType, Guid entityId, [FromBody] WorkflowRequest req) { var revision = new ContentRevision { Id = Guid.NewGuid(), EntityType = entityType, EntityId = entityId, ToStatus = req.Status, Notes = req.Notes, CreatedBy = req.CreatedBy, CreatedAt = DateTime.UtcNow }; _db.ContentRevisions.Add(revision); await _db.SaveChangesAsync(); return Ok(revision); }

    // ─── Dashboard Stats ─────────────────────────────────────────
    [HttpGet("dashboard")] public async Task<IActionResult> GetDashboard()
    {
        return Ok(new
        {
            totalPages = await _db.ContentPages.CountAsync(),
            publishedPages = await _db.ContentPages.CountAsync(x => x.Status == "published"),
            draftPages = await _db.ContentPages.CountAsync(x => x.Status == "draft"),
            blogPosts = await _db.BlogPosts.CountAsync(),
            publishedPosts = await _db.BlogPosts.CountAsync(x => x.Status == "published"),
            services = await _db.Services.CountAsync(),
            products = await _db.Products.CountAsync(),
            testimonials = await _db.Testimonials.CountAsync(),
            teamMembers = await _db.CmsTeamMembers.CountAsync(),
            partners = await _db.Partners.CountAsync(),
            jobs = await _db.JobPositions.CountAsync(),
            faqs = await _db.Faqs.CountAsync(),
            mediaFiles = await _db.MediaFiles.CountAsync(),
            popups = await _db.Popups.CountAsync(),
            announcements = await _db.Announcements.CountAsync(),
            forms = await _db.CmsForms.CountAsync(),
            campaigns = await _db.Campaigns.CountAsync(),
        });
    }

    // ─── Helpers ─────────────────────────────────────────────────
    private async Task SaveWithVersion(Guid entityId, string entityType, object entity)
    {
        await _db.SaveChangesAsync();
        var version = await _db.ContentVersions.Where(x => x.EntityType == entityType && x.EntityId == entityId).MaxAsync(x => (int?)x.Version) ?? 0;
        _db.ContentVersions.Add(new ContentVersion
        {
            Id = Guid.NewGuid(),
            EntityType = entityType,
            EntityId = entityId,
            Content = System.Text.Json.JsonSerializer.Serialize(entity),
            Version = version + 1,
            CreatedAt = DateTime.UtcNow
        });
        await _db.SaveChangesAsync();
    }
}

public class WorkflowRequest
{
    public string Status { get; set; } = "";
    public string? Notes { get; set; }
    public string? CreatedBy { get; set; }
}
