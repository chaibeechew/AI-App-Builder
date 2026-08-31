import PublishingReadinessPanel from "./PublishingReadinessPanel";

export default async function PublishLayout({children,params}){
  const {id}=await params;
  return <>{children}<PublishingReadinessPanel appId={id}/></>;
}
