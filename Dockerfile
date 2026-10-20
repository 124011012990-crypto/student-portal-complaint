# CampusCare PHP 8.2 Production Container
FROM php:8.2-apache

# Install system dependencies and PHP extensions
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    unzip \
    curl \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) pdo pdo_mysql gd zip \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Enable Apache rewrite and headers modules
RUN a2enmod rewrite headers

# Configure Apache DocumentRoot to point strictly to backend/public
ENV APACHE_DOCUMENT_ROOT /var/www/html/backend/public
RUN sed -ri -e 's!/var/www/html!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/sites-available/000-default.conf
RUN sed -ri -e 's!/var/www/!${APACHE_DOCUMENT_ROOT}!g' /etc/apache2/apache2.conf /etc/apache2/conf-available/*.conf

# Set working directory
WORKDIR /var/www/html

# Copy application files
COPY . /var/www/html/

# Create storage directories and set secure permissions
RUN mkdir -p backend/storage/logs backend/storage/uploads backend/storage/exports backend/storage/tmp backend/storage/private \
    && chown -R www-data:www-data backend/storage \
    && chmod -R 775 backend/storage

# Expose HTTP port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/api/departments || exit 1

CMD ["apache2-foreground"]
