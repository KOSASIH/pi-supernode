package metrics

import (
	"net/http"
	"time"

	"github.com/labstack/echo/v4"
	"github.com/labstack/echo/v4/middleware"
	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func HTTPMetricsMiddleware() echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			start := time.Now()
			req := c.Request()
			
			// OpenTelemetry HTTP instrumentation
			resp := otelhttp.NewHandler(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				next(c)
			}), "pi-supernode-http")
			
			latency := time.Since(start)
			RecordHTTPRequest(c.Request().Method, c.Request().URL.Path, latency, c.Response().Status)
			
			return c.String(200, "OK")
		}
	}
}

func RecordHTTPRequest(method, path string, latency time.Duration, status int) {
	// HTTP metrics
	httpRequests.Add(context.Background(), 1,
		metric.WithAttributes(
			attribute.String("method", method),
			attribute.String("path", path),
			attribute.Int("status", status),
		),
	)
}
