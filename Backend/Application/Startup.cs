using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Application.Services;
using Data.Context;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.HttpsPolicy;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using Microsoft.EntityFrameworkCore;
using Data.Repositories;
using Domain.Interface;
using AutoMapper;

namespace Application
{
    /// <summary>ASP.NET Core startup: CORS, controllers, JWT auth, EF, AutoMapper, Swagger.</summary>
    public class Startup
    {
        public Startup(IConfiguration configuration)
        {
            Configuration = configuration;
        }

        public IConfiguration Configuration { get; }

        /// <summary>Register services: CORS, controllers (camelCase JSON), Swagger, DbContext, generic repo, AutoMapper, JWT.</summary>
        public void ConfigureServices(IServiceCollection services)
        {
            // CORS: allow Angular frontend
            services.AddCors(options =>
            {
                options.AddDefaultPolicy(builder =>
                {
                    builder.WithOrigins("http://localhost:4200")
                        .AllowAnyHeader()
                        .AllowAnyMethod();
                });
            });
            services.AddControllers()
                .AddNewtonsoftJson(options =>
                {
                    options.SerializerSettings.ContractResolver = new Newtonsoft.Json.Serialization.CamelCasePropertyNamesContractResolver();
                });
            services.AddSwaggerGen(c =>
            {
                c.SwaggerDoc("v1", new OpenApiInfo { Title = "APP", Version = "v1" });
            });
            // EF Core + generic repository + AutoMapper
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(Configuration.GetConnectionString("Connection")));
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddAutoMapper(typeof(Mapping.AppMappingProfile));

            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IAlertTriggerService, AlertTriggerService>();

            // JWT Bearer authentication
            var jwtKey = Configuration["Jwt:Key"] ?? "DefaultSecretKeyForJwtTokenGenerationMinimum32Chars";
            var jwtKeyBytes = Encoding.UTF8.GetBytes(jwtKey);
            services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
                .AddJwtBearer(options =>
                {
                    options.TokenValidationParameters = new TokenValidationParameters
                    {
                        ValidateIssuerSigningKey = true,
                        IssuerSigningKey = new SymmetricSecurityKey(jwtKeyBytes),
                        ValidateIssuer = true,
                        ValidIssuer = Configuration["Jwt:Issuer"] ?? "InventaireApi",
                        ValidateAudience = true,
                        ValidAudience = Configuration["Jwt:Audience"] ?? "InventaireApp",
                        ValidateLifetime = true,
                        ClockSkew = TimeSpan.Zero
                    };
                });
        }
        /// <summary>Configure pipeline: exception page, HTTPS, CORS, auth, Swagger, endpoints.</summary>
        public void Configure(IApplicationBuilder app, IWebHostEnvironment env)
        {
            if (env.IsDevelopment())
            {
                app.UseDeveloperExceptionPage();
                
            }

            if (!env.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            app.UseRouting();

            app.UseCors();

            app.UseAuthentication();
            app.UseAuthorization();
            app.UseSwagger();
            app.UseSwaggerUI(c =>
            {
                c.SwaggerEndpoint("/swagger/v1/swagger.json", "APP V1");
            });

            app.UseEndpoints(endpoints =>
            {
                endpoints.MapControllers();
            });

        }
    }
}
