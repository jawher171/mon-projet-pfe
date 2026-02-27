using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Text;
using System.Threading.Tasks;
using Application.Services;
using Data.Context;
using Application.Commands;
using Application.Events;
using Application.Handlers;
using Domain.Commands;
using Domain.Handlers;
using Domain.Interface;
using Domain.Models;
using Domain.Queries;
using MediatR;
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

                c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
                {
                    Description = "Enter your JWT token",
                    Name = "Authorization",
                    In = ParameterLocation.Header,
                    Type = SecuritySchemeType.Http,
                    Scheme = "bearer",
                    BearerFormat = "JWT"
                });

                c.AddSecurityRequirement(new OpenApiSecurityRequirement
                {
                    {
                        new OpenApiSecurityScheme
                        {
                            Reference = new OpenApiReference
                            {
                                Type = ReferenceType.SecurityScheme,
                                Id = "Bearer"
                            },
                            Scheme = "bearer",
                            Name = "Bearer",
                            In = ParameterLocation.Header
                        },
                        Array.Empty<string>()
                    }
                });
            });
            // EF Core + generic repository + AutoMapper
            services.AddDbContext<AppDbContext>(options =>
                options.UseSqlServer(Configuration.GetConnectionString("Connection")));
            services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
            services.AddAutoMapper(typeof(Mapping.AppMappingProfile));

            // MediatR: register core services
            services.AddMediatR(typeof(AddGenericHandler<>).Assembly);

            // Register closed generic CQRS handlers for each entity type
            RegisterGenericHandlers<Alert>(services);
            RegisterGenericHandlers<Category>(services);
            RegisterGenericHandlers<Product>(services);
            RegisterGenericHandlers<Site>(services);
            RegisterGenericHandlers<Stock>(services);
            RegisterGenericHandlers<StockMovement>(services);
            RegisterGenericHandlers<User>(services);
            RegisterGenericHandlers<Role>(services);

            // Register dedicated stock movement CQRS handlers
            services.AddTransient<IRequestHandler<CreateStockMovementCommand, CreateStockMovementResult>, CreateStockMovementHandler>();
            services.AddTransient<IRequestHandler<UpdateStockMovementCommand, UpdateStockMovementResult>, UpdateStockMovementHandler>();
            services.AddTransient<IRequestHandler<DeleteStockMovementCommand, DeleteStockMovementResult>, DeleteStockMovementHandler>();

            services.AddScoped<IJwtService, JwtService>();
            services.AddScoped<IAlertService, AlertService>();
            services.AddScoped<IAlertTriggerService, AlertService>();

            // StockChangedEvent notification handler (alert engine)
            services.AddTransient<INotificationHandler<StockChangedEvent>, StockChangedEventHandler>();

            // JWT Bearer authentication
            var jwtKey = Configuration["Jwt:Key"] ?? "DefaultSecretKeyForJwtTokenGenerationMinimum32Chars";
            var jwtKeyBytes = Encoding.UTF8.GetBytes(jwtKey);
            services.AddAuthentication(options =>
                {
                    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
                    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
                })
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

        /// <summary>Register closed generic CQRS handlers for a single entity type.</summary>
        private static void RegisterGenericHandlers<TEntity>(IServiceCollection services) where TEntity : class
        {
            services.AddTransient<IRequestHandler<AddGenericCommand<TEntity>, TEntity>, AddGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<PutGenericCommand<TEntity>, TEntity>, PutGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<GetGenericQuery<TEntity>, TEntity>, GetGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<GetListGenericQuery<TEntity>, IEnumerable<TEntity>>, GetListGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<RemoveGenericCommand<TEntity>, TEntity>, RemoveGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<GetPagedListGenericQuery<TEntity>, PagedResult<TEntity>>, GetPagedListGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<GetCountGenericQuery<TEntity>, int>, GetCountGenericHandler<TEntity>>();
            services.AddTransient<IRequestHandler<ExistsGenericQuery<TEntity>, bool>, ExistsGenericHandler<TEntity>>();
        }
    }
}
