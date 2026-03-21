package metrics

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func GRPCServerInterceptor() grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		ctx, span := tracer.Start(ctx, info.FullMethod)
		defer span.End()
		
		start := time.Now()
		resp, err := handler(ctx, req)
		
		latency := time.Since(start)
		code := status.Code(err)
		if code == codes.OK {
			code = codes.Unknown
		}
		
		span.SetAttributes(
			attribute.String("grpc.method", info.FullMethod),
			attribute.Int64("grpc.latency_ms", latency.Milliseconds()),
			attribute.String("grpc.status_code", code.String()),
		)
		
		return resp, err
	}
}
