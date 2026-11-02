package com.rowan.tools.pahojvm;

import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.security.cert.CertificateException;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.jar.JarFile;
import javax.net.ssl.SSLException;
import org.eclipse.paho.client.mqttv3.*;
import org.eclipse.paho.client.mqttv3.logging.Logger;
import org.eclipse.paho.client.mqttv3.logging.LoggerFactory;
import org.eclipse.paho.client.mqttv3.persist.MemoryPersistence;

/** Isolated actual-service probe. Secrets enter stdin only; no raw SDK output is retained. */
public final class PahoJvmProbe {
    private static final PrintStream SAFE = System.out;
    private enum Stage { SDK_READY, LOGGER_SELF_CHECK, INPUT, CONNECT, SUBSCRIBE, GET_PUBACK, GET_ACCEPTED, GET_REJECTED, DISCONNECT, WATCHDOG, UNCAUGHT }
    private enum Result { PASS, FAILURE, TIMEOUT }
    private static synchronized void emit(Stage stage, Result result, Throwable error, long duration) {
        Integer reason = null;
        String category = "OTHER", kind = error==null?"NONE":"CONFIGURATION";
        if (error != null) {
            if (error instanceof MqttException) {
                reason = ((MqttException) error).getReasonCode();
                if (reason == 4 || reason == 5) kind = "AUTHORIZATION";
                else if (reason == 32000 || reason == 32002) kind = "TIMEOUT";
                else if (reason == 3 || reason == 32103 || reason == 32104 || reason == 32109) kind = "UNAVAILABLE";
            } else if (error instanceof IOException) kind = "UNAVAILABLE";
            Set<Throwable> seen = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
            Throwable cause = error;
            for (int i=0; i<8 && cause!=null && seen.add(cause); i++) {
                String candidate = "OTHER";
                if (cause instanceof UnknownHostException) candidate="DNS";
                else if (cause instanceof ConnectException || cause instanceof NoRouteToHostException) candidate="CONNECT";
                else if (cause instanceof SSLException || cause instanceof CertificateException) candidate="TLS";
                else if (cause instanceof SocketTimeoutException) candidate="TIMEOUT";
                else if (cause instanceof ProtocolException) candidate="WEBSOCKET";
                else if (cause instanceof IOException) candidate="IO";
                if (category.equals("OTHER") || category.equals("IO") && !candidate.equals("OTHER") && !candidate.equals("IO")) category=candidate;
                try { cause=cause.getCause(); } catch (Throwable ignored) { cause=null; }
            }
            if (category.equals("OTHER") && reason!=null && (reason==32000 || reason==32002)) category="TIMEOUT";
        }
        SAFE.println("{\"stage\":\""+stage.name()+"\",\"result\":\""+result.name()+"\",\"kind\":\""+kind+"\",\"reasonCode\":"+(reason==null?"null":reason.toString())+",\"causeCategory\":\""+category+"\",\"durationMs\":"+Math.max(0,Math.min(120000,duration))+"}");
        SAFE.flush();
    }
    private static String readField(DataInputStream in, int limit) throws IOException {
        int size=in.readInt();
        if(size<0 || size>limit) throw new IOException();
        byte[] bytes=new byte[size]; in.readFully(bytes);
        String value=new String(bytes, StandardCharsets.UTF_8);
        Arrays.fill(bytes,(byte)0); return value;
    }
    private static void silence() {
        System.setOut(new PrintStream(OutputStream.nullOutputStream()));
        System.setErr(new PrintStream(OutputStream.nullOutputStream()));
        java.util.logging.LogManager.getLogManager().reset();
        java.util.logging.Logger.getLogger("").setLevel(java.util.logging.Level.OFF);
        LoggerFactory.setLogger(SilentLogger.class.getName());
    }
    public static void main(String[] args) {
        silence();
        Thread.setDefaultUncaughtExceptionHandler((thread,error)->{emit(Stage.UNCAUGHT,Result.FAILURE,error,0);Runtime.getRuntime().halt(1);});
        Thread watchdog=new Thread(()->{try{Thread.sleep(55000);}catch(InterruptedException ignored){return;}emit(Stage.WATCHDOG,Result.TIMEOUT,null,55000);Runtime.getRuntime().halt(124);},"paho-probe-watchdog");
        watchdog.setDaemon(true);watchdog.start();
        MqttAsyncClient client=null;
        Stage stage=Stage.SDK_READY;
        int exit=0;
        long started=System.nanoTime();
        try {
            if(args.length<1 || args.length>2) throw new IOException();
            try(JarFile jar=new JarFile(args[0])) {
                if(!"1.2.5".equals(jar.getManifest().getMainAttributes().getValue("Bundle-Version"))) throw new IOException();
            }
            emit(Stage.SDK_READY,Result.PASS,null,elapsed(started));
            if(args.length==2) {
                if(!args[1].equals("--self-check")) throw new IOException();
                Logger logger=LoggerFactory.getLogger(LoggerFactory.MQTT_CLIENT_MSG_CAT,"safe-self-check");
                Object bomb=new Object(){public String toString(){throw new AssertionError();}};
                if(!(logger instanceof SilentLogger) || logger.isLoggable(Logger.SEVERE) || !"[disabled]".equals(logger.formatMessage("sensitive",new Object[]{bomb}))) throw new IOException();
                emit(Stage.LOGGER_SELF_CHECK,Result.PASS,null,elapsed(started));
                Runtime.getRuntime().halt(0);
            }
            stage=Stage.INPUT;
            DataInputStream input=new DataInputStream(System.in);
            String magic=readField(input,32);
            String uri=readField(input,65536),clientId=readField(input,1024),thing=readField(input,1024),username=readField(input,8192),password=readField(input,8192);
            URI endpoint=new URI(uri);
            if(!magic.equals("ROWAN_JVM_PAHO_V1") || !"wss".equals(endpoint.getScheme()) || endpoint.getPort()!=443 || endpoint.getHost()==null || endpoint.getUserInfo()!=null || endpoint.getFragment()!=null || !"/mqtt".equals(endpoint.getRawPath()) || clientId.isEmpty() || thing.isEmpty() || thing.matches(".*[/+#\\p{Cntrl}].*") || username.isEmpty()!=password.isEmpty() || endpoint.getRawQuery()!=null && !username.isEmpty()) throw new IOException();
            String prefix="$aws/things/"+thing+"/shadow";
            String[] topics={prefix+"/get/accepted",prefix+"/get/rejected",prefix+"/update/accepted",prefix+"/update/rejected"};
            CountDownLatch response=new CountDownLatch(1);
            AtomicInteger outcome=new AtomicInteger();
            AtomicBoolean querySent=new AtomicBoolean();
            AtomicReference<Throwable> loss=new AtomicReference<>();
            client=new MqttAsyncClient(uri,clientId,new MemoryPersistence());
            DisconnectedBufferOptions buffer=new DisconnectedBufferOptions();buffer.setBufferEnabled(false);buffer.setPersistBuffer(false);client.setBufferOpts(buffer);
            client.setCallback(new MqttCallback(){
                public void connectionLost(Throwable cause){loss.compareAndSet(null,cause);if(outcome.compareAndSet(0,3))response.countDown();}
                public void deliveryComplete(IMqttDeliveryToken token){}
                public void messageArrived(String topic,MqttMessage message){
                    if(!querySent.get() || (!topics[0].equals(topic) && !topics[1].equals(topic)))return;
                    int next=message.getPayload().length>131072?4:topics[0].equals(topic)?1:2;
                    if(outcome.compareAndSet(0,next))response.countDown();
                }
            });
            MqttConnectOptions config=new MqttConnectOptions();config.setCleanSession(true);config.setMqttVersion(MqttConnectOptions.MQTT_VERSION_3_1_1);config.setAutomaticReconnect(false);config.setConnectionTimeout(15);config.setHttpsHostnameVerificationEnabled(true);
            if(!username.isEmpty()){config.setUserName(username);config.setPassword(password.toCharArray());}
            stage=Stage.CONNECT;started=System.nanoTime();client.connect(config).waitForCompletion(15000);emit(stage,Result.PASS,null,elapsed(started));
            stage=Stage.SUBSCRIBE;started=System.nanoTime();IMqttToken subscribed=client.subscribe(topics,new int[]{1,1,1,1});subscribed.waitForCompletion(10000);
            int[] grants=subscribed.getGrantedQos();if(grants==null || grants.length!=4 || Arrays.stream(grants).anyMatch(q->q!=1))throw new MqttException(128);
            emit(stage,Result.PASS,null,elapsed(started));
            stage=Stage.GET_PUBACK;started=System.nanoTime();querySent.set(true);client.publish(prefix+"/get",new byte[0],1,false).waitForCompletion(5000);emit(stage,Result.PASS,null,elapsed(started));
            stage=Stage.GET_ACCEPTED;started=System.nanoTime();
            if(!response.await(10,TimeUnit.SECONDS))throw new MqttException(32000);
            if(outcome.get()==3){Throwable cause=loss.get();throw cause==null?new IOException():cause;}
            if(outcome.get()==2){stage=Stage.GET_REJECTED;throw new MqttException(128);}
            if(outcome.get()!=1)throw new IOException();
            emit(stage,Result.PASS,null,elapsed(started));
        } catch(Throwable error) {exit=1;emit(stage,Result.FAILURE,error,elapsed(started));}
        finally {
            if(client!=null){long cleanup=System.nanoTime();try{client.disconnectForcibly(0,1000);client.close(true);emit(Stage.DISCONNECT,Result.PASS,null,elapsed(cleanup));}catch(Throwable error){exit=1;emit(Stage.DISCONNECT,Result.FAILURE,error,elapsed(cleanup));try{client.close(true);}catch(Throwable ignored){}}}
        }
        Runtime.getRuntime().halt(exit);
    }
    private static long elapsed(long start){return TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start);}

    /** Public no-arg class required by Paho LoggerFactory reflection. Every method discards input. */
    public static final class SilentLogger implements Logger {
        public SilentLogger(){}
        public void initialise(ResourceBundle bundle,String id,String resource){}
        public void setResourceName(String value){}
        public boolean isLoggable(int level){return false;}
        public String formatMessage(String message,Object[] values){return "[disabled]";}
        public void dumpTrace(){}
        public void log(int level,String c,String m,String message,Object[] values,Throwable error){}
        public void trace(int level,String c,String m,String message,Object[] values,Throwable error){}
        public void severe(String c,String m,String message){}
        public void severe(String c,String m,String message,Object[] values){}
        public void severe(String c,String m,String message,Object[] values,Throwable error){}
        public void warning(String c,String m,String message){}
        public void warning(String c,String m,String message,Object[] values){}
        public void warning(String c,String m,String message,Object[] values,Throwable error){}
        public void info(String c,String m,String message){}
        public void info(String c,String m,String message,Object[] values){}
        public void info(String c,String m,String message,Object[] values,Throwable error){}
        public void config(String c,String m,String message){}
        public void config(String c,String m,String message,Object[] values){}
        public void config(String c,String m,String message,Object[] values,Throwable error){}
        public void fine(String c,String m,String message){}
        public void fine(String c,String m,String message,Object[] values){}
        public void fine(String c,String m,String message,Object[] values,Throwable error){}
        public void finer(String c,String m,String message){}
        public void finer(String c,String m,String message,Object[] values){}
        public void finer(String c,String m,String message,Object[] values,Throwable error){}
        public void finest(String c,String m,String message){}
        public void finest(String c,String m,String message,Object[] values){}
        public void finest(String c,String m,String message,Object[] values,Throwable error){}
    }
}
