package httpapi

import "context"

func withAuthUser(ctx context.Context, user authUser) context.Context {
	return context.WithValue(ctx, ctxUserKey, user)
}

func authUserFrom(ctx context.Context) (authUser, bool) {
	user, ok := ctx.Value(ctxUserKey).(authUser)
	return user, ok
}
