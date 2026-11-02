import com.google.zxing.*;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.HybridBinarizer;
import com.google.zxing.multi.qrcode.QRCodeMultiReader;
import com.google.zxing.qrcode.QRCodeWriter;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.*;
import java.util.List;

/** Standalone public-fixture spike. javase is tooling only, never an Android dependency. */
class QrDecoderPoc {
    static final String PUBLIC_TEXT="ROWAN LOCAL QR SOFTWARE FIXTURE A";
    static final int MAX_BYTES=1024*1024,MAX_SIDE=2048,MAX_PIXELS=4*1024*1024,MAX_TEXT_BYTES=512;
    record Decoded(String status,List<String> texts) {
        @Override public String toString(){return "Decoded("+status+",redacted)";}
    }
    static final List<String> checks=new ArrayList<>();
    static final List<String> fixtures=new ArrayList<>();

    public static void main(String[] args)throws Exception {
        if(args.length!=1||Runtime.version().feature()!=17)throw new IllegalArgumentException("Java 17 and one output directory required");
        Path dir=Path.of(args[0]);Files.createDirectories(dir);
        BufferedImage normal=qr(PUBLIC_TEXT,512);
        Path plain=png(dir,"normal",normal,PUBLIC_TEXT);
        expect("normal_decode",plain,"code",PUBLIC_TEXT);
        BufferedImage rotated=new BufferedImage(512,512,BufferedImage.TYPE_INT_RGB);
        for(int y=0;y<512;y++)for(int x=0;x<512;x++)rotated.setRGB(511-y,x,normal.getRGB(x,y));
        expect("rotation_90",png(dir,"rotated90",rotated,PUBLIC_TEXT),"code",PUBLIC_TEXT);
        expect("blank",png(dir,"blank",white(512,512),null),"no_code",null);
        BufferedImage damaged=white(512,512);Graphics2D dg=damaged.createGraphics();dg.drawImage(normal,0,0,null);dg.setColor(Color.WHITE);dg.fillRect(0,200,512,312);dg.dispose();
        check("damaged_fixture_is_not_blank",!Arrays.equals(damaged.getRGB(0,0,512,512,null,0,512),white(512,512).getRGB(0,0,512,512,null,0,512)));
        expect("destroyed_symbol",png(dir,"damaged",damaged,null),"no_code",null);
        Path truncated=dir.resolve("truncated.png");Files.write(truncated,new byte[]{(byte)137,80,78,71,13,10,26,10});
        fixture(truncated,null);expect("truncated_png",truncated,"image_invalid",null);
        BufferedImage multiple=white(1024,512);Graphics2D mg=multiple.createGraphics();mg.drawImage(normal,0,0,null);mg.drawImage(qr("ROWAN LOCAL QR SOFTWARE FIXTURE B",512),512,0,null);mg.dispose();
        Path many=png(dir,"multiple",multiple,null);Decoded multi=decode(many);check("multiple_codes",multi.status.equals("multiple_codes")&&multi.texts.size()==2);
        String longText="Q".repeat(1025);Path largeText=png(dir,"long_text",qr(longText,1024),longText);
        Decoded longResult=decode(largeText);check("long_qr_decodes",longResult.status.equals("code")&&longResult.texts.equals(List.of(longText)));
        check("text_budget_rejected",interpret(longResult).equals("text_too_large"));
        expect("image_dimensions",png(dir,"wide",white(2200,32),null),"resource_limit",null);
        Path tooManyBytes=dir.resolve("over_budget.bin");Files.write(tooManyBytes,new byte[MAX_BYTES+1]);fixture(tooManyBytes,null);
        expect("image_bytes",tooManyBytes,"resource_limit",null);
        check("production_parser_gate",interpret(decode(plain)).equals("unsupported_code"));
        check("empty_text_gate",interpret(new Decoded("code",List.of(""))).equals("unsupported_code"));
        check("multiple_never_auto_selects",interpret(multi).equals("multiple_codes"));
        Path unknown=png(dir,"public_json",qr("{\"sample\":\"public\"}",512),"{\"sample\":\"public\"}");
        check("unknown_json_gate",interpret(decode(unknown)).equals("unsupported_code"));
        check("raw_text_redacted",!decode(plain).toString().contains(PUBLIC_TEXT));
        String report="{\"javaFeature\":17,\"decoder\":\"ZXing core 3.5.4\",\"productionParser\":\"absent\",\"businessRequests\":0,\"checks\":["+String.join(",",checks)+"],\"fixtures\":["+String.join(",",fixtures)+"]}";
        Files.writeString(dir.resolve("poc.json"),report,StandardCharsets.UTF_8);
        // Fixed counts only: never print a caller's decoded text.
        System.out.println("ZXing fixture checks passed: "+checks.size());
    }
    static Decoded decode(Path file) {
        try {
            if(Files.size(file)>MAX_BYTES)return new Decoded("resource_limit",List.of());
            try(ImageInputStream stream=ImageIO.createImageInputStream(file.toFile())) {
                if(stream==null)return new Decoded("image_invalid",List.of());
                Iterator<ImageReader> readers=ImageIO.getImageReaders(stream);
                if(!readers.hasNext())return new Decoded("image_invalid",List.of());
                ImageReader reader=readers.next();BufferedImage image;
                try {
                    reader.setInput(stream,true,true);int width=reader.getWidth(0),height=reader.getHeight(0);
                    if(width<=0||height<=0||width>MAX_SIDE||height>MAX_SIDE||(long)width*height>MAX_PIXELS)return new Decoded("resource_limit",List.of());
                    image=reader.read(0);
                }finally {reader.dispose();}
                BinaryBitmap bitmap=new BinaryBitmap(new HybridBinarizer(new BufferedImageLuminanceSource(image)));
                Result[] results=new QRCodeMultiReader().decodeMultiple(bitmap,Map.of(DecodeHintType.TRY_HARDER,true));
                List<String> values=Arrays.stream(results).map(Result::getText).distinct().toList();
                return new Decoded(values.size()>1?"multiple_codes":"code",values);
            }
        }catch(NotFoundException noCode){return new Decoded("no_code",List.of());}
        catch(Exception invalid){return new Decoded("image_invalid",List.of());}
    }
    static String interpret(Decoded result) {
        if(!result.status.equals("code"))return result.status;
        if(result.texts.size()!=1)return "multiple_codes";
        if(result.texts.get(0).getBytes(StandardCharsets.UTF_8).length>MAX_TEXT_BYTES)return "text_too_large";
        // There is deliberately no ROWAN schema, URL handler or binding client.
        return "unsupported_code";
    }
    static BufferedImage qr(String text,int size)throws Exception {
        return MatrixToImageWriter.toBufferedImage(new QRCodeWriter().encode(text,BarcodeFormat.QR_CODE,size,size,
            Map.of(EncodeHintType.CHARACTER_SET,"UTF-8",EncodeHintType.MARGIN,4)));
    }
    static BufferedImage white(int w,int h){BufferedImage image=new BufferedImage(w,h,BufferedImage.TYPE_INT_RGB);Graphics2D g=image.createGraphics();g.setColor(Color.WHITE);g.fillRect(0,0,w,h);g.dispose();return image;}
    static Path png(Path dir,String name,BufferedImage image,String text)throws Exception {Path file=dir.resolve(name+".png");ImageIO.write(image,"PNG",file.toFile());fixture(file,text);return file;}
    static void fixture(Path file,String text)throws Exception {
        byte[] bytes=Files.readAllBytes(file);
        fixtures.add("{\"file\":\""+file.getFileName()+"\",\"sha256\":\""+sha(bytes)+"\",\"bytes\":"+bytes.length+
            (text==null?"":",\"publicTextSha256\":\""+sha(text.getBytes(StandardCharsets.UTF_8))+"\",\"publicTextUtf8Bytes\":"+text.getBytes(StandardCharsets.UTF_8).length)+"}");
    }
    static String sha(byte[] data)throws Exception{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(data));}
    static void expect(String name,Path file,String status,String text){Decoded result=decode(file);check(name,result.status.equals(status)&&(text==null||result.texts.equals(List.of(text))));}
    static void check(String name,boolean passed){checks.add("{\"name\":\""+name+"\",\"passed\":"+passed+"}");if(!passed)throw new AssertionError("Fixture check failed: "+name);}
}
