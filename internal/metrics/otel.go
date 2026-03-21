package metrics

import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc"
    "go.opentelemetry.io/otel/sdk/metric"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

var meter = otel.Meter("pi-supernode")

func InitMetrics(ctx context.Context, endpoint string) error {
    exporter, err := otlpmetricgrpc.New(ctx,
        otlpmetricgrpc.WithInsecure(),
        otlpmetricgrpc.WithEndpoint(endpoint),
    )
    if err != nil {
        return err
    }
    
    provider := metric.NewMeterProvider(
        metric.WithResource(resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceNameKey.String("pi-supernode"),
        )),
        metric.WithReader(metric.NewPeriodicReader(exporter)),
    )
    
    otel.SetMeterProvider(provider)
    return nil
}

// Usage example
func RecordTPS(tps float64) {
    counter, _ := meter.Float64Counter("transactions_per_second")
    counter.Add(context.Background(), tps,
        metric.WithAttributes(
            attribute.String("network", "pi-testnet"),
        ),
    )
}
