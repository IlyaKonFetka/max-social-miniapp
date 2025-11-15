package ru.chousik.backend_calls;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class BackendCallsApplication {

	public static void main(String[] args) {
		SpringApplication.run(BackendCallsApplication.class, args);
	}

}
